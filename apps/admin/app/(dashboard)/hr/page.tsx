import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, Card, PageHeader } from "@system2026/ui";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";

const HR_SECTIONS: { href: string; title: string; description: string }[] = [
  { href: "/hr/employees", title: "الموظفون", description: "بيانات الموظفين، الوظائف، الرواتب الأساسية والبدلات" },
  { href: "/hr/attendance", title: "الحضور", description: "تسجيل حضور وانصراف وغياب كل موظف يوميًا" },
  { href: "/hr/leaves", title: "الإجازات", description: "طلبات الإجازة واعتمادها أو رفضها" },
  { href: "/hr/leave-balances", title: "أرصدة الإجازات", description: "الأيام المستحقة والمستخدمة لكل موظف بكل سنة" },
  { href: "/hr/shifts", title: "الورديات والبصمة", description: "إدارة الورديات — تسجيل يدوي بدل جهاز بصمة فعلي" },
  { href: "/hr/payroll", title: "مسير الرواتب", description: "إنشاء مسير رواتب شهري وتعديل خصومات كل بند" },
  { href: "/hr/advances", title: "السلف والعهد", description: "سلف الموظفين والعهد المسندة إليهم" },
  { href: "/hr/payroll-payments", title: "صرف الأجور", description: "صرف بنود الرواتب المعتمدة وتسجيل طريقة الدفع" },
  { href: "/hr/end-of-service", title: "مكافأة نهاية الخدمة", description: "احتساب مكافأة نهاية الخدمة عند إنهاء عقد موظف" },
  { href: "/hr/appraisals", title: "التقييم الوظيفي", description: "تقييمات دورية لأداء الموظفين" },
  { href: "/hr/me", title: "بياناتي", description: "بيانات الموظف المرتبط بحسابك الشخصي" },
];

export default async function HrHubPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="الموارد البشرية"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HR_SECTIONS.map((section) => (
          <Card key={section.href}>
            <h2 className="font-semibold">{section.title}</h2>
            <p className="mt-1 text-sm text-foreground/60">{section.description}</p>
            <div className="mt-4">
              <Link href={section.href}>
                <Button variant="outline">فتح</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
