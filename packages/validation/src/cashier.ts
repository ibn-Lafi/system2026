import { z } from "zod";

// نفس صيغة رقم الجوال السعودي المحلي المستخدمة بنموذج store_leads
// (packages/validation/src/settings.ts) — يُركَّب لاحقًا بصيغة +966XXXXXXXXX
// قبل تخزينه، لضمان تطابق البحث بالجوال عبر find_or_create_customer_by_phone
// بغض النظر عن قناة الدخول (كاشير أو متجر).
const localPhoneSchema = z.string().regex(/^05[0-9]{8}$/, "رقم جوال سعودي غير صالح (مثال: 05xxxxxxxx)");

// دخول الكاشير: الموظف يختار اسمه من قائمة ثم يدخل رقمه الخاص — الجلسة
// الناتجة تمثّل هذا الموظف بعينه (وليس جهازًا عامًا)، وتُنسب كل فاتورة كاشير
// له (راجع cashier_employee_id بجدول invoices).
export const pinLoginSchema = z.object({
  employeeId: z.string().uuid(),
  pin: z.string().regex(/^[0-9]{4,6}$/, "رمز PIN يجب أن يكون بين 4 و6 أرقام"),
});
export type PinLoginInput = z.infer<typeof pinLoginSchema>;

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

// لقطة سلة (للسلات المتروكة، store_cart_sessions) — تُرسَل من الفرونت إند
// فقط للعرض بلوحة التحكم لاحقًا، لا تُستخدم في أي حساب مالي، لذا تحقّق بنيوي
// خفيف يكفي (طول الاسم/عدد البنود) بدل تكرار posSaleItemSchema الأدق.
export const cartSnapshotItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(200),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});
export const cartSnapshotSchema = z.array(cartSnapshotItemSchema).max(100);
export type CartSnapshotInput = z.infer<typeof cartSnapshotSchema>;

export const updateLoyaltyRatioSchema = z.object({
  loyaltyRiyalsPerPoint: z.number().positive("المعدّل يجب أن يكون أكبر من صفر"),
});
export type UpdateLoyaltyRatioInput = z.infer<typeof updateLoyaltyRatioSchema>;
