import { z } from "zod";

// نفس صيغة رقم الجوال السعودي المحلي المستخدمة بنموذج store_leads
// (packages/validation/src/settings.ts) — يُركَّب لاحقًا بصيغة +966XXXXXXXXX
// قبل تخزينه، لضمان تطابق البحث بالجوال عبر find_or_create_customer_by_phone
// بغض النظر عن قناة الدخول (كاشير أو متجر).
const localPhoneSchema = z.string().regex(/^05[0-9]{8}$/, "رقم جوال سعودي غير صالح (مثال: 05xxxxxxxx)");

export const pinLoginSchema = z.object({
  pin: z.string().regex(/^[0-9]{4,6}$/, "رمز PIN يجب أن يكون بين 4 و6 أرقام"),
});
export type PinLoginInput = z.infer<typeof pinLoginSchema>;

export const cashierTerminalSchema = z.object({
  name: z.string().min(1, "اسم الحاوية مطلوب"),
  pin: z.string().regex(/^[0-9]{4,6}$/, "رمز PIN يجب أن يكون بين 4 و6 أرقام"),
});
export type CashierTerminalInput = z.infer<typeof cashierTerminalSchema>;

export const resetCashierTerminalPinSchema = z.object({
  terminalId: z.string().uuid(),
  pin: z.string().regex(/^[0-9]{4,6}$/, "رمز PIN يجب أن يكون بين 4 و6 أرقام"),
});
export type ResetCashierTerminalPinInput = z.infer<typeof resetCashierTerminalPinSchema>;

export const posSaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive("الكمية يجب أن تكون أكبر من صفر"),
});

export const identifyCustomerSchema = z.object({
  phone: localPhoneSchema,
  name: z.string().min(1, "الاسم مطلوب").optional(),
});
export type IdentifyCustomerInput = z.infer<typeof identifyCustomerSchema>;

export const posSaleSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(posSaleItemSchema).min(1, "أضف منتجًا واحدًا على الأقل"),
  paymentMethod: z.enum(["cash", "credit", "check", "transfer"]),
});
export type PosSaleInput = z.infer<typeof posSaleSchema>;

export const storeOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(posSaleItemSchema).min(1, "السلة فارغة"),
});
export type StoreOrderInput = z.infer<typeof storeOrderSchema>;

export const updateLoyaltyRatioSchema = z.object({
  loyaltyRiyalsPerPoint: z.number().positive("المعدّل يجب أن يكون أكبر من صفر"),
});
export type UpdateLoyaltyRatioInput = z.infer<typeof updateLoyaltyRatioSchema>;
