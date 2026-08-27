import { z } from "zod";

export const returnItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  condition: z.enum(["resalable", "damaged", "expired"]),
});

export const createReturnSchema = z.object({
  customerId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  items: z.array(returnItemSchema).min(1, "يجب إضافة بند واحد على الأقل"),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
