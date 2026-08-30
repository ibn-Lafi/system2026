import { z } from "zod";

export const hrLeaveTypeSchema = z.enum(["annual", "sick", "unpaid", "other"]);
export const hrLeaveStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const hrAttendanceStatusSchema = z.enum(["present", "absent", "late", "on_leave"]);
export const hrAdvanceStatusSchema = z.enum(["pending", "approved", "repaid"]);
export const hrCustodyStatusSchema = z.enum(["assigned", "returned"]);

export const shiftFieldsSchema = z.object({
  name: z.string().min(1, "اسم الوردية مطلوب"),
  startTime: z.string().min(1, "وقت البداية مطلوب"),
  endTime: z.string().min(1, "وقت النهاية مطلوب"),
});

export const createShiftSchema = shiftFieldsSchema;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;

export const updateShiftSchema = shiftFieldsSchema.extend({ id: z.string().uuid() });
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;

export const employeeFieldsSchema = z.object({
  fullName: z.string().min(1, "اسم الموظف مطلوب"),
  nationalId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().min(1, "تاريخ التعيين مطلوب"),
  shiftId: z.string().uuid().optional(),
  basicSalary: z.number().nonnegative("الراتب الأساسي يجب أن يكون صفر أو أكبر"),
  housingAllowance: z.number().nonnegative().default(0),
  otherAllowances: z.number().nonnegative().default(0),
});

export const createEmployeeSchema = employeeFieldsSchema;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = employeeFieldsSchema.extend({
  id: z.string().uuid(),
  isActive: z.boolean().default(true),
});
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const createAttendanceRecordSchema = z.object({
  employeeId: z.string().uuid(),
  workDate: z.string().min(1, "التاريخ مطلوب"),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: hrAttendanceStatusSchema.default("present"),
  notes: z.string().optional(),
});
export type CreateAttendanceRecordInput = z.infer<typeof createAttendanceRecordSchema>;

export const createLeaveRequestSchema = z
  .object({
    employeeId: z.string().uuid(),
    leaveType: hrLeaveTypeSchema,
    startDate: z.string().min(1, "تاريخ البداية مطلوب"),
    endDate: z.string().min(1, "تاريخ النهاية مطلوب"),
    daysCount: z.number().positive("عدد الأيام يجب أن يكون أكبر من صفر"),
    reason: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية",
    path: ["endDate"],
  });
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const reviewLeaveRequestSchema = z.object({
  id: z.string().uuid(),
});

export const adjustLeaveBalanceSchema = z.object({
  employeeId: z.string().uuid(),
  leaveType: hrLeaveTypeSchema,
  year: z.number().int(),
  entitledDays: z.number().nonnegative("عدد الأيام المستحقة يجب أن يكون صفر أو أكبر"),
});
export type AdjustLeaveBalanceInput = z.infer<typeof adjustLeaveBalanceSchema>;

export const createAdvanceSchema = z.object({
  employeeId: z.string().uuid(),
  amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  reason: z.string().optional(),
  monthlyDeductionAmount: z.number().nonnegative().default(0),
});
export type CreateAdvanceInput = z.infer<typeof createAdvanceSchema>;

export const updateAdvanceStatusSchema = z.object({
  id: z.string().uuid(),
  status: hrAdvanceStatusSchema,
});
export type UpdateAdvanceStatusInput = z.infer<typeof updateAdvanceStatusSchema>;

export const createCustodyItemSchema = z.object({
  employeeId: z.string().uuid(),
  itemName: z.string().min(1, "اسم العهدة مطلوب"),
  description: z.string().optional(),
});
export type CreateCustodyItemInput = z.infer<typeof createCustodyItemSchema>;

export const returnCustodyItemSchema = z.object({
  id: z.string().uuid(),
});

export const generatePayrollRunSchema = z.object({
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2000),
});
export type GeneratePayrollRunInput = z.infer<typeof generatePayrollRunSchema>;

export const updatePayrollItemDeductionsSchema = z.object({
  payrollItemId: z.string().uuid(),
  deductions: z.number().nonnegative("قيمة الخصم يجب أن تكون صفر أو أكبر"),
});
export type UpdatePayrollItemDeductionsInput = z.infer<typeof updatePayrollItemDeductionsSchema>;

export const payPayrollItemSchema = z.object({
  payrollItemId: z.string().uuid(),
  method: z.enum(["cash", "check", "transfer"]),
});
export type PayPayrollItemInput = z.infer<typeof payPayrollItemSchema>;

export const calculateEndOfServiceSchema = z.object({
  employeeId: z.string().uuid(),
  terminationDate: z.string().min(1, "تاريخ انتهاء الخدمة مطلوب"),
});
export type CalculateEndOfServiceInput = z.infer<typeof calculateEndOfServiceSchema>;

export const createAppraisalSchema = z.object({
  employeeId: z.string().uuid(),
  appraisalPeriod: z.string().min(1, "فترة التقييم مطلوبة"),
  score: z.number().min(0).max(100, "الدرجة يجب أن تكون بين 0 و100"),
  strengths: z.string().optional(),
  areasForImprovement: z.string().optional(),
});
export type CreateAppraisalInput = z.infer<typeof createAppraisalSchema>;
