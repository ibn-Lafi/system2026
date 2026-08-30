import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { getProfitSummary } from "../../../../lib/get-profitability";
import { getCustomerOutstandingBalances, getSupplierOutstandingBalances } from "../../../../lib/get-balances";
import { toCsv } from "../../../../lib/csv";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقدًا",
  credit: "آجل",
  check: "شيك",
  transfer: "تحويل",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
  cancelled: "ملغاة",
};

function csvResponse(fileName: string, csv: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}.csv"`,
    },
  });
}

// راجع apps/admin/app/(dashboard)/reports/page.tsx — نموذج GET عادي (بدون
// JS) يفتح هذا المسار مباشرة فيبدأ المتصفح تنزيل الملف تلقائيًا.
export async function GET(request: NextRequest) {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "view_reports")) {
    return NextResponse.json({ error: "غير مصرح لك بالوصول للتقارير" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") ? `${searchParams.get("to")}T23:59:59` : undefined;

  const supabase = createSupabaseServerClient();

  switch (type) {
    case "profitability": {
      const summary = await getProfitSummary({ from, to });
      const productIds = Array.from(summary.byProduct.keys());
      const { data: products } =
        productIds.length > 0
          ? await supabase.from("products").select<"id, name", { id: string; name: string }>("id, name").in("id", productIds)
          : { data: [] as { id: string; name: string }[] };
      const nameById = new Map((products ?? []).map((p) => [p.id, p.name]));

      const rows = Array.from(summary.byProduct.entries())
        .sort((a, b) => b[1].profit - a[1].profit)
        .map(([productId, stats]) => [
          nameById.get(productId) ?? productId,
          stats.quantity,
          stats.sales.toFixed(2),
          stats.profit.toFixed(2),
          stats.sales > 0 ? `${((stats.profit / stats.sales) * 100).toFixed(1)}%` : "—",
        ]);

      return csvResponse(
        "تقرير-الربحية",
        toCsv(["المنتج", "الكمية المباعة", "المبيعات", "الربح", "هامش الربح"], rows),
      );
    }

    case "invoices": {
      let query = supabase
        .from("invoices")
        .select<
          "invoice_number, invoice_date, customer_id, payment_method, status, subtotal, vat_amount, total_amount",
          {
            invoice_number: number;
            invoice_date: string;
            customer_id: string;
            payment_method: string;
            status: string;
            subtotal: number;
            vat_amount: number;
            total_amount: number;
          }
        >("invoice_number, invoice_date, customer_id, payment_method, status, subtotal, vat_amount, total_amount")
        .order("invoice_number", { ascending: false });
      if (from) query = query.gte("invoice_date", from);
      if (to) query = query.lte("invoice_date", to);
      const { data: invoices } = await query;

      const customerIds = Array.from(new Set((invoices ?? []).map((i) => i.customer_id)));
      const { data: customers } =
        customerIds.length > 0
          ? await supabase
              .from("customers")
              .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
                "id, name, shop_name",
              )
              .in("id", customerIds)
          : { data: [] as { id: string; name: string; shop_name: string | null }[] };
      const customerNameById = new Map((customers ?? []).map((c) => [c.id, c.shop_name ?? c.name]));

      const rows = (invoices ?? []).map((inv) => [
        inv.invoice_number,
        inv.invoice_date.slice(0, 10),
        customerNameById.get(inv.customer_id) ?? "—",
        PAYMENT_METHOD_LABELS[inv.payment_method] ?? inv.payment_method,
        INVOICE_STATUS_LABELS[inv.status] ?? inv.status,
        inv.subtotal.toFixed(2),
        inv.vat_amount.toFixed(2),
        inv.total_amount.toFixed(2),
      ]);

      return csvResponse(
        "تقرير-الفواتير",
        toCsv(
          ["رقم الفاتورة", "التاريخ", "العميل", "طريقة الدفع", "الحالة", "قبل الضريبة", "الضريبة", "الإجمالي"],
          rows,
        ),
      );
    }

    case "losses": {
      let query = supabase
        .from("stock_movements")
        .select<"product_id, quantity_change, created_at", { product_id: string; quantity_change: number; created_at: string }>(
          "product_id, quantity_change, created_at",
        )
        .eq("movement_type", "write_off");
      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to);
      const { data: movements } = await query;

      const productIds = Array.from(new Set((movements ?? []).map((m) => m.product_id)));
      const { data: products } =
        productIds.length > 0
          ? await supabase
              .from("products")
              .select<"id, name, average_cost", { id: string; name: string; average_cost: number }>(
                "id, name, average_cost",
              )
              .in("id", productIds)
          : { data: [] as { id: string; name: string; average_cost: number }[] };
      const productById = new Map((products ?? []).map((p) => [p.id, p]));

      const lossByProduct = new Map<string, number>();
      for (const m of movements ?? []) {
        const cost = productById.get(m.product_id)?.average_cost ?? 0;
        const value = Math.abs(m.quantity_change) * cost;
        lossByProduct.set(m.product_id, (lossByProduct.get(m.product_id) ?? 0) + value);
      }

      const rows = Array.from(lossByProduct.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([productId, value]) => [productById.get(productId)?.name ?? productId, value.toFixed(2)]);

      return csvResponse("تقرير-الخسائر", toCsv(["المنتج", "قيمة الخسارة"], rows));
    }

    case "receivables": {
      const balances = await getCustomerOutstandingBalances();
      const customerIds = Array.from(balances.debtByEntity.keys());
      const { data: customers } =
        customerIds.length > 0
          ? await supabase
              .from("customers")
              .select<"id, name, shop_name, phone", { id: string; name: string; shop_name: string | null; phone: string | null }>(
                "id, name, shop_name, phone",
              )
              .in("id", customerIds)
          : { data: [] as { id: string; name: string; shop_name: string | null; phone: string | null }[] };
      const customerById = new Map((customers ?? []).map((c) => [c.id, c]));

      const rows = Array.from(balances.debtByEntity.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([customerId, debt]) => {
          const c = customerById.get(customerId);
          return [c?.shop_name ?? c?.name ?? customerId, c?.phone ?? "—", debt.toFixed(2)];
        });

      return csvResponse("تقرير-ديون-العملاء", toCsv(["العميل", "الجوال", "المبلغ المستحق"], rows));
    }

    case "payables": {
      const balances = await getSupplierOutstandingBalances();
      const supplierIds = Array.from(balances.debtByEntity.keys());
      const { data: suppliers } =
        supplierIds.length > 0
          ? await supabase
              .from("suppliers")
              .select<"id, name, phone", { id: string; name: string; phone: string | null }>("id, name, phone")
              .in("id", supplierIds)
          : { data: [] as { id: string; name: string; phone: string | null }[] };
      const supplierById = new Map((suppliers ?? []).map((s) => [s.id, s]));

      const rows = Array.from(balances.debtByEntity.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([supplierId, debt]) => {
          const s = supplierById.get(supplierId);
          return [s?.name ?? supplierId, s?.phone ?? "—", debt.toFixed(2)];
        });

      return csvResponse("تقرير-مستحقات-الموردين", toCsv(["المورد", "الجوال", "المبلغ المستحق"], rows));
    }

    case "expiry": {
      const { data: settings } = await supabase
        .from("system_settings")
        .select<"expiry_alert_days_threshold", { expiry_alert_days_threshold: number }>(
          "expiry_alert_days_threshold",
        )
        .eq("id", 1)
        .single();
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + (settings?.expiry_alert_days_threshold ?? 30));

      const { data: products } = await supabase
        .from("products")
        .select<"name, expiry_date", { name: string; expiry_date: string | null }>("name, expiry_date")
        .eq("has_expiry", true)
        .lte("expiry_date", thresholdDate.toISOString().slice(0, 10));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const rows = (products ?? [])
        .filter((p) => p.expiry_date)
        .sort((a, b) => (a.expiry_date! < b.expiry_date! ? -1 : 1))
        .map((p) => {
          const daysLeft = Math.ceil((new Date(p.expiry_date!).getTime() - today.getTime()) / 86400000);
          return [p.name, p.expiry_date!, daysLeft <= 0 ? "منتهية" : `${daysLeft} يوم`];
        });

      return csvResponse("تقرير-قرب-انتهاء-الصلاحية", toCsv(["المنتج", "تاريخ الانتهاء", "المتبقي"], rows));
    }

    default:
      return NextResponse.json({ error: "نوع تقرير غير معروف" }, { status: 400 });
  }
}
