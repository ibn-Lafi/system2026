import type { ReceiptData } from "../app/(pos)/actions";

// إيصال حراري ضيق (80مم) — طباعة مباشرة عبر window.print() بدل توليد PDF
// (أنسب لطابعات نقاط البيع الحرارية المُركَّبة كطابعة نظام عادية). راجع
// @media print بـapp/globals.css لقاعدة @page الخاصة بهذا العرض.
export function ThermalReceipt({ receipt }: { receipt: ReceiptData }) {
  return (
    <div id="receipt-print-root" className="mx-auto w-[80mm] bg-background p-3 text-xs" dir="rtl">
      <div className="text-center">
        <p className="text-sm font-bold">{receipt.companyName}</p>
        <p className="mt-0.5">الرقم الضريبي: {receipt.vatRegistrationNumber}</p>
      </div>

      <div className="my-2 border-t border-dashed border-foreground/40" />

      <div className="flex justify-between">
        <span>فاتورة رقم</span>
        <span>{receipt.invoiceNumber}</span>
      </div>
      <div className="flex justify-between">
        <span>التاريخ</span>
        <span>{receipt.date}</span>
      </div>
      <div className="flex justify-between">
        <span>العميل</span>
        <span>{receipt.customerName}</span>
      </div>

      <div className="my-2 border-t border-dashed border-foreground/40" />

      <table className="w-full">
        <thead>
          <tr className="text-right">
            <th className="font-normal">الصنف</th>
            <th className="font-normal">الكمية</th>
            <th className="font-normal">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, i) => (
            <tr key={i}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.subtotal}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-2 border-t border-dashed border-foreground/40" />

      <div className="flex justify-between">
        <span>الإجمالي قبل الضريبة</span>
        <span>{receipt.subtotal}</span>
      </div>
      <div className="flex justify-between">
        <span>ضريبة القيمة المضافة</span>
        <span>{receipt.vatAmount}</span>
      </div>
      <div className="mt-1 flex justify-between text-sm font-bold">
        <span>الإجمالي</span>
        <span>{receipt.totalAmount}</span>
      </div>

      <div className="mt-3 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={receipt.qrCodeImage} alt="QR الفاتورة الضريبية" width={110} height={110} />
      </div>

      <p className="mt-3 text-center">شكرًا لزيارتكم</p>
    </div>
  );
}
