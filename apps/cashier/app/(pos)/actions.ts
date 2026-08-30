"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { identifyCustomerSchema, posSaleSchema } from "@system2026/validation";
import { renderQrCodeDataUrl, formatCurrency } from "@system2026/utils";
import { createSupabaseAdminClient } from "../../lib/supabase-admin";
import { CASHIER_SESSION_COOKIE, verifySessionToken } from "../../lib/session";

async function requireTerminalId(): Promise<string> {
  const session = await verifySessionToken(cookies().get(CASHIER_SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  return session.terminalId;
}

export async function logoutAction(): Promise<void> {
  cookies().delete(CASHIER_SESSION_COOKIE);
  redirect("/login");
}

export type IdentifyCustomerResult = {
  customerId?: string;
  customerName?: string;
  loyaltyPoints?: number;
  error?: string;
};

// يُنادى مباشرة من مكوّن العميل (بدون form action) عند إدخال رقم الجوال —
// يستدعي find_or_create_customer_by_phone المشتركة مع apps/store، فيضمن
// نفس هوية العميل بغض النظر عن قناة أول تواصل معه.
export async function identifyCustomerAction(phone: string, name?: string): Promise<IdentifyCustomerResult> {
  await requireTerminalId();

  const parsed = identifyCustomerSchema.safeParse({ phone, name });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "رقم جوال غير صالح" };

  const fullPhone = `+966${parsed.data.phone.slice(1)}`;
  const supabase = createSupabaseAdminClient();
  const { data: customerId, error } = await supabase.rpc("find_or_create_customer_by_phone", {
    p_phone: fullPhone,
    p_name: parsed.data.name ?? null,
  });
  if (error || !customerId) return { error: error?.message ?? "تعذّر إيجاد/تسجيل العميل" };

  const { data: customer } = await supabase
    .from("customers")
    .select<"name, loyalty_points", { name: string; loyalty_points: number }>("name, loyalty_points")
    .eq("id", customerId)
    .single();

  return { customerId, customerName: customer?.name, loyaltyPoints: customer?.loyalty_points ?? 0 };
}

export type ReceiptData = {
  invoiceNumber: number;
  date: string;
  companyName: string;
  vatRegistrationNumber: string;
  customerName: string;
  items: { name: string; quantity: number; unitPrice: string; subtotal: string }[];
  subtotal: string;
  vatAmount: string;
  totalAmount: string;
  qrCodeImage: string;
};

export type CheckoutResult = { receipt?: ReceiptData; error?: string };

export async function checkoutAction(input: {
  customerId: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: "cash" | "credit" | "check" | "transfer";
}): Promise<CheckoutResult> {
  const terminalId = await requireTerminalId();

  const parsed = posSaleSchema.safeParse({
    customerId: input.customerId,
    items: input.items,
    paymentMethod: input.paymentMethod,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات البيع غير صالحة" };

  const supabase = createSupabaseAdminClient();
  const { data: invoiceId, error } = await supabase.rpc("create_cashier_sale", {
    p_terminal_id: terminalId,
    p_customer_id: parsed.data.customerId,
    p_items: parsed.data.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    p_payment_method: parsed.data.paymentMethod,
  });
  if (error || !invoiceId) return { error: error?.message ?? "تعذّر إتمام البيع" };

  type InvoiceRow = {
    invoice_number: number;
    invoice_date: string;
    subtotal: number;
    vat_amount: number;
    total_amount: number;
    qr_code_data: string;
  };
  type InvoiceItemRow = { product_id: string; quantity_in_unit: number; unit_price: number; subtotal: number };
  type ProductRow = { id: string; name: string };

  const [{ data: invoice }, { data: items }, { data: settings }, { data: customer }] = await Promise.all([
    supabase
      .from("invoices")
      .select<
        "invoice_number, invoice_date, subtotal, vat_amount, total_amount, qr_code_data",
        InvoiceRow
      >("invoice_number, invoice_date, subtotal, vat_amount, total_amount, qr_code_data")
      .eq("id", invoiceId)
      .single(),
    supabase
      .from("invoice_items")
      .select<"product_id, quantity_in_unit, unit_price, subtotal", InvoiceItemRow>(
        "product_id, quantity_in_unit, unit_price, subtotal",
      )
      .eq("invoice_id", invoiceId),
    supabase
      .from("system_settings")
      .select<"company_name, vat_registration_number", { company_name: string; vat_registration_number: string }>(
        "company_name, vat_registration_number",
      )
      .eq("id", 1)
      .single(),
    supabase.from("customers").select<"name", { name: string }>("name").eq("id", parsed.data.customerId).single(),
  ]);

  if (!invoice) return { error: "تم إصدار الفاتورة لكن تعذّر تحميل بيانات الإيصال" };

  const productIds = [...new Set((items ?? []).map((item) => item.product_id))];
  const { data: products } = await supabase
    .from("products")
    .select<"id, name", ProductRow>("id, name")
    .in("id", productIds);
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));

  const qrCodeImage = await renderQrCodeDataUrl(invoice.qr_code_data);

  return {
    receipt: {
      invoiceNumber: invoice.invoice_number,
      date: new Date(invoice.invoice_date).toLocaleString("ar-SA"),
      companyName: settings?.company_name ?? "",
      vatRegistrationNumber: settings?.vat_registration_number ?? "",
      customerName: customer?.name ?? "",
      items: (items ?? []).map((item) => ({
        name: productNameById.get(item.product_id) ?? "منتج",
        quantity: item.quantity_in_unit,
        unitPrice: formatCurrency(item.unit_price),
        subtotal: formatCurrency(item.subtotal),
      })),
      subtotal: formatCurrency(invoice.subtotal),
      vatAmount: formatCurrency(invoice.vat_amount),
      totalAmount: formatCurrency(invoice.total_amount),
      qrCodeImage,
    },
  };
}
