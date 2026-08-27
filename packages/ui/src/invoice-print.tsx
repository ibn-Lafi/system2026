import { formatCurrency } from "@system2026/utils";
import { DocumentHeader } from "./document-header";

export type InvoicePrintItem = {
  id: string;
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type InvoicePrintProps = {
  companyName: string;
  companyVatNumber: string;
  companyCommercialRegistration?: string | null;
  companyAddress?: string | null;
  invoiceNumber: number;
  invoiceDate: string;
  paymentMethodLabel: string;
  customerName: string;
  customerCommercialRegistration?: string | null;
  customerVatNumber?: string | null;
  customerAddress?: string | null;
  branchName?: string | null;
  discountPercentage: number;
  items: InvoicePrintItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  notes?: string | null;
  qrCodeImage: string;
};

// مستند الفاتورة الضريبية بمقاس A4 — يُطبع عبر
// window.print()، وقواعد @media print بكل تطبيق (globals.css) تُظهر هذا
// العنصر فقط (id="invoice-print-root") بحجم الصفحة الفعلي بغض النظر عن
// تخطيط الصفحة المحيطة به على الشاشة.
export function InvoicePrintDocument({
  companyName,
  companyVatNumber,
  companyCommercialRegistration,
  companyAddress,
  invoiceNumber,
  invoiceDate,
  paymentMethodLabel,
  customerName,
  customerCommercialRegistration,
  customerVatNumber,
  customerAddress,
  branchName,
  discountPercentage,
  items,
  subtotal,
  vatAmount,
  totalAmount,
  notes,
  qrCodeImage,
}: InvoicePrintProps) {
  const date = new Date(invoiceDate);
  const dateLabel = date.toLocaleDateString("ar-SA-u-nu-latn", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      id="invoice-print-root"
      dir="rtl"
      className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[14mm] text-[11px] leading-relaxed text-neutral-900 shadow-card print:m-0 print:w-full print:shadow-none"
    >
      <DocumentHeader
        companyName={companyName}
        companyVatNumber={companyVatNumber}
        companyCommercialRegistration={companyCommercialRegistration}
        companyAddress={companyAddress}
        title="فاتورة ضريبية"
        documentNumberLabel="رقم الفاتورة"
        documentNumber={invoiceNumber}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        paymentMethodLabel={paymentMethodLabel}
      />

      {/* ===== مصدرة إلى (بيانات العميل) ===== */}
      <div className="mt-5 border-t border-neutral-200 pt-4">
        <p className="mb-1 font-bold underline decoration-neutral-300 underline-offset-4">مصدرة إلى:</p>
        <p className="font-semibold">{customerName}</p>
        {branchName ? <p className="text-neutral-600">فرع: {branchName}</p> : null}
        {customerCommercialRegistration ? (
          <p className="text-neutral-600">السجل التجاري: {customerCommercialRegistration}</p>
        ) : null}
        {customerVatNumber ? <p className="text-neutral-600">الرقم الضريبي: {customerVatNumber}</p> : null}
        {customerAddress ? <p className="text-neutral-600">الموقع: {customerAddress}</p> : null}
      </div>

      {/* ===== جدول المنتجات ===== */}
      <table className="mt-5 w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-y border-neutral-300 bg-neutral-50 text-neutral-600">
            <th className="py-2 pr-2 text-right font-semibold">المنتج</th>
            <th className="text-right font-semibold">الوحدة</th>
            <th className="text-right font-semibold">الكمية</th>
            <th className="text-right font-semibold">السعر</th>
            <th className="text-right font-semibold">الضريبة</th>
            <th className="pl-2 text-left font-semibold">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const itemVat = Math.round(item.subtotal * 0.15 * 100) / 100;
            return (
              <tr key={item.id} className="border-b border-neutral-200">
                <td className="py-2 pr-2">{item.productName}</td>
                <td>{item.unitName}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td>{formatCurrency(itemVat)}</td>
                <td className="pl-2 text-left font-medium">{formatCurrency(item.subtotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ===== المجاميع — بنفس ترتيب/عرض جدول المنتجات، بلا صندوق منفصل ===== */}
      <div className="mt-2 w-full border-t border-neutral-300">
        <div className="flex justify-between border-b border-neutral-200 py-2 font-semibold text-neutral-700">
          <span>الإجمالي الفرعي (غير شامل الضريبة)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between border-b border-neutral-200 py-2 font-semibold text-neutral-700">
          <span>ضريبة القيمة المضافة (15%)</span>
          <span>{formatCurrency(vatAmount)}</span>
        </div>
        <div className="flex justify-between py-2.5 text-sm font-extrabold">
          <span>إجمالي الفاتورة</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* ===== تفاصيل الفاتورة (بعد الإجمالي) ===== */}
      {discountPercentage > 0 ? (
        <div className="mt-3 border-t border-neutral-200 pt-3">
          <p className="mb-1 font-bold underline decoration-neutral-300 underline-offset-4">تفاصيل الفاتورة:</p>
          <p>
            <span className="text-neutral-500">نسبة الخصم المتفق عليها: </span>
            {discountPercentage}%
          </p>
        </div>
      ) : null}

      {/* ===== ملاحظات ===== */}
      {notes ? (
        <div className="mt-5 border-t border-neutral-200 pt-3">
          <p className="mb-1 font-bold">ملاحظات:</p>
          <p className="whitespace-pre-wrap leading-relaxed text-neutral-700">{notes}</p>
        </div>
      ) : null}

      {/* ===== QR ===== */}
      <div className="mt-6 flex flex-col items-center border-t border-neutral-200 pt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCodeImage} alt="QR الفاتورة الضريبية" width={90} height={90} />
        <p className="mt-1 text-[10px] text-neutral-500">امسح الرمز للاطلاع على الفاتورة الضريبية</p>
      </div>
    </div>
  );
}
