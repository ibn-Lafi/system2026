import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "اسم السجل مطلوب"),
  shopName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  cityId: z.string().uuid().optional(),
  notes: z.string().optional(),
  googleMapsLink: z.string().url("رابط جوجل ماب غير صالح").optional(),
  commercialRegistrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  showInStore: z.boolean().default(false),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.extend({
  id: z.string().uuid(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const createCitySchema = z.object({
  name: z.string().min(1, "اسم المدينة مطلوب"),
});

export const updateCitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "اسم المدينة مطلوب"),
});

export const branchFieldsSchema = z.object({
  name: z.string().min(1, "اسم الفرع مطلوب"),
  shopName: z.string().optional(),
  address: z.string().optional(),
  cityId: z.string().uuid().optional(),
  phone: z.string().optional(),
  googleMapsLink: z.string().url("رابط جوجل ماب غير صالح").optional(),
  showInStore: z.boolean().default(false),
});

export const createBranchSchema = branchFieldsSchema.extend({
  customerId: z.string().uuid(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = branchFieldsSchema.extend({
  id: z.string().uuid(),
});

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

export const addLoyaltyPointsSchema = z.object({
  customerId: z.string().uuid(),
  points: z.number().int().positive("عدد النقاط يجب أن يكون أكبر من صفر"),
  reason: z.string().min(1, "سبب إضافة النقاط مطلوب"),
});

export type AddLoyaltyPointsInput = z.infer<typeof addLoyaltyPointsSchema>;

export const createComplaintSchema = z.object({
  customerId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  description: z.string().min(1, "نص الشكوى مطلوب"),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const updateComplaintStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved"]),
});

export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
