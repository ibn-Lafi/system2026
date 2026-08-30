import { Card } from "@system2026/ui";
import { getCurrentUserRole } from "../../lib/get-current-role";
import { MODULES, getModuleTileHref } from "../../lib/modules";
import { ModuleTile } from "../../components/module-tile";

// صفحة المربّعات = أول ما يظهر بعد تسجيل الدخول: مربّع لكل قسم كبير من
// النظام (مبني من packages/../lib/modules.ts، المصدر الوحيد لهذا التقسيم).
// كل مربّع يظهر فقط لمن يملك صلاحية الوصول لصفحة واحدة على الأقل بداخله،
// ويأخذك مباشرة لأول صفحة يملك صلاحيتها — الشريط الجانبي بعدها (راجع
// layout.tsx) يعرض حصرًا صفحات ذاك القسم.
export default async function ModulesHubPage() {
  const role = await getCurrentUserRole();

  const tiles = MODULES.map((mod) => ({ mod, href: getModuleTileHref(mod, role) })).filter(
    (t): t is { mod: (typeof MODULES)[number]; href: string } => t.href !== null,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">أقسام النظام</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ mod, href }) => (
          <ModuleTile key={mod.key} href={href} icon={mod.icon} label={mod.label} description={mod.description} />
        ))}
      </div>

      {tiles.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground/60">لا توجد أقسام متاحة لحسابك حاليًا — راجع الأدمن لتفعيل صلاحياتك.</p>
        </Card>
      ) : null}
    </div>
  );
}
