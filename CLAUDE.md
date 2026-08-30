# CLAUDE.md — دليل العمل التقني لهذا المستودع

> هذا الملف يُقرأ تلقائيًا من قبل Claude Code عند العمل على هذا المستودع.
> يحتوي على كل القرارات التقنية، معايير الكود، والقواعد الأمنية الملزمة.
> **لا يجوز مخالفة أي بند هنا بدون تحديث هذا الملف أولًا ومناقشته.**

---

## 1. نظرة عامة على المشروع

نظام توزيع ومبيعات ميدانية (Van Sales) يتكون من 3 تطبيقات ويب + قاعدة بيانات مشتركة:

| التطبيق | الوصف | من يستخدمه | نوع الوصول |
|---|---|---|---|
| `apps/admin` | لوحة التحكم الرئيسية | أدمن، محاسب | محمي (Auth) |
| `apps/rep` | تطبيق المندوب الميداني | مندوبين | محمي (Auth) |
| `apps/store` | متجر عرض المنتجات | زوار عامة | عام (بدون تسجيل دخول) |

راجع `requirements.md` في جذر المستودع لتفاصيل المتطلبات الوظيفية الكاملة (الأدوار، الفواتير، التحصيلات، إلخ). هذا الملف يركّز فقط على **كيف نبني** وليس **ماذا نبني**.

---

## 2. المكدس التقني (Tech Stack)

- **Frontend:** Next.js 14+ (App Router), TypeScript (strict mode إجباري)
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend/Database:** Supabase (PostgreSQL + Auth + Row Level Security + Storage + Edge Functions)
- **Validation:** Zod (schema واحدة تُستخدم على الفورم والسيرفر)
- **Package Manager:** pnpm (إجباري — لا تستخدم npm أو yarn)
- **Monorepo:** pnpm workspaces + Turborepo
- **Hosting Frontend:** Railway (3 خدمات منفصلة، خدمة لكل تطبيق)
- **Hosting Backend:** Supabase Cloud (مُدار بالكامل)
- **CI:** GitHub Actions (lint + typecheck + test على كل PR)
- **Testing:** Vitest (unit) + Playwright (E2E للمسارات الحرجة فقط)

**ممنوع إضافة أي مكتبة أو تقنية جديدة للمشروع بدون سبب واضح موثّق في commit message.** كل مكتبة جديدة = مساحة هجوم إضافية + تعقيد صيانة.

---

## 3. بنية المستودع (Monorepo Structure)

```
/
├── apps/
│   ├── admin/              # لوحة التحكم (أدمن + محاسب)
│   │   ├── app/             # Next.js App Router
│   │   │   ├── (auth)/       # صفحات تسجيل الدخول
│   │   │   ├── (dashboard)/  # الصفحات المحمية بعد الدخول
│   │   │   │   ├── products/
│   │   │   │   ├── reps/
│   │   │   │   ├── customers/
│   │   │   │   ├── invoices/
│   │   │   │   ├── collections/
│   │   │   │   └── reports/
│   │   │   └── layout.tsx
│   │   ├── components/       # مكونات خاصة بهذا التطبيق فقط
│   │   ├── lib/               # منطق خاص بهذا التطبيق (actions, hooks)
│   │   └── middleware.ts     # حماية المسارات + التحقق من الدور (role)
│   │
│   ├── rep/                 # تطبيق المندوب
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── route/         # عرض خط السير والعملاء
│   │   │   ├── invoice/new/   # إصدار فاتورة جديدة
│   │   │   └── collections/   # تسجيل تحصيل ميداني
│   │   └── ...(نفس نمط admin)
│   │
│   └── store/                # المتجر العام
│       ├── app/
│       │   ├── page.tsx        # الصفحة الرئيسية
│       │   ├── product/[id]/   # صفحة تفاصيل منتج
│       │   └── category/[slug]/
│       └── ...
│
├── packages/
│   ├── database/             # كل ما يخص Supabase
│   │   ├── migrations/        # ملفات SQL للترحيل (versioned)
│   │   ├── types.ts            # أنواع TypeScript مولّدة تلقائيًا من Supabase
│   │   └── policies/           # توثيق RLS policies (نسخة قابلة للقراءة)
│   │
│   ├── ui/                    # مكونات تصميم مشتركة (Button, Input, Card...)
│   ├── validation/             # Zod schemas مشتركة (Invoice, Product, Customer...)
│   ├── utils/                  # دوال مساعدة عامة (formatCurrency, calculateVAT...)
│   └── config/                 # eslint.config.js, tsconfig.base.json, tailwind.config مشترك
│
├── .github/workflows/         # CI pipelines
├── requirements.md             # ملف المتطلبات الوظيفية
├── CLAUDE.md                   # هذا الملف
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### قاعدة أساسية
أي منطق أو مكوّن **يُستخدم في أكثر من تطبيق واحد** يُنقل فورًا إلى `packages/`. لا تكرار كود بين `apps/admin` و `apps/rep` و `apps/store`.

---

## 4. قاعدة البيانات و Supabase

### 4.1 مبدأ التصميم
- كل جدول له **RLS مفعّل إجباريًا** (`ENABLE ROW LEVEL SECURITY`) — **بدون استثناء**، حتى لو الجدول يبدو "غير حساس".
- الافتراضي هو **الرفض (Deny by default)**: لا وصول لأي جدول إلا بـ policy صريحة.
- كل جدول له عمود `created_at`, `updated_at` (مع trigger تلقائي للتحديث).
- المفاتيح الأساسية `UUID` وليس `serial/int` (يمنع تخمين IDs، أفضل للأنظمة الموزعة).

### 4.2 مثال RLS Policy (نموذج إلزامي الاتباع)
```sql
-- مثال: المندوب يشوف بس فواتيره الخاصة، الأدمن يشوف الكل
CREATE POLICY "reps_view_own_invoices"
ON invoices FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'admin'
  OR auth.jwt() ->> 'role' = 'accountant'
  OR rep_id = auth.uid()
);

CREATE POLICY "reps_insert_own_invoices"
ON invoices FOR INSERT
WITH CHECK (rep_id = auth.uid());
```

### 4.2.1 RLS خاص بصفحة "نقاط البيع" العامة (متجر بدون تسجيل دخول)
المتجر تطبيق **عام بدون Auth**، فيحتاج Policy مختلفة تكشف فقط الحقول العامة (اسم المحل، المنطقة، رابط الموقع) للعملاء اللي `show_in_store = true`، وتُخفي كل شي ثاني (جوال، ديون، ملاحظات):

```sql
-- Policy منفصلة للوصول العام (anon) — تفلتر بالصف والعمود معًا عبر View
CREATE VIEW public_store_locations AS
SELECT id, shop_name, google_maps_link
FROM customers
WHERE show_in_store = true;

-- الفرونت إند بالمتجر يقرأ من هذا الـ View فقط، وليس من جدول customers مباشرة
-- هذا يمنع أي احتمال تسريب حقل حساس حتى لو صار خطأ مستقبلي بإضافة عمود جديد للجدول الأساسي
```

> **قاعدة:** أي بيانات تُعرض للعامة (بدون Auth) **يجب** أن تمر عبر `VIEW` مخصص يحدد الأعمدة المسموحة صراحة — لا يُسمح إطلاقًا بإعطاء `anon role` صلاحية `SELECT` مباشرة على جدول `customers` الكامل.


### 4.3 العمليات الحرجة تُنفَّذ عبر Postgres Functions (RPC) وليس مباشرة من الفرونت

**السبب:** إصدار فاتورة يتطلب (1) إنشاء الفاتورة (2) إنشاء بنودها (3) خصم الكمية من مخزون المندوب — هذه العمليات **يجب أن تحدث كمعاملة واحدة (transaction)** لتفادي:
- بيع كمية أكبر من المتاح فعليًا (Race Condition لو المندوب سجّل فاتورتين بسرعة)
- فاتورة بدون خصم مخزون (بيانات غير متسقة)

```sql
CREATE OR REPLACE FUNCTION create_invoice_with_stock_check(
  p_rep_id UUID,
  p_customer_id UUID,
  p_items JSONB,       -- [{product_id, quantity, unit_price}]
  p_payment_method TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER      -- تُنفَّذ بصلاحيات مرتفعة، بعد التحقق الداخلي فقط
AS $$
DECLARE
  v_invoice_id UUID;
  v_item JSONB;
BEGIN
  -- 1. التحقق أن كل الكميات المطلوبة متوفرة في رصيد المندوب
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF (SELECT quantity_available FROM rep_inventory
        WHERE rep_id = p_rep_id AND product_id = (v_item->>'product_id')::UUID)
        < (v_item->>'quantity')::INT THEN
      RAISE EXCEPTION 'الكمية غير متوفرة في مخزون المندوب';
    END IF;
  END LOOP;

  -- 2. إنشاء الفاتورة، بنودها، وخصم المخزون — كل هذا داخل نفس الـ transaction
  -- (التفاصيل الكاملة تُبنى أثناء التنفيذ الفعلي)

  RETURN v_invoice_id;
END;
$$;
```

> **قاعدة صارمة:** أي عملية تمس أكثر من جدول واحد بشكل مترابط (فاتورة + مخزون + تحصيل) **يجب** أن تُكتب كـ Postgres Function وليس كسلسلة استدعاءات منفصلة من الفرونت إند.

### 4.3.1 عمليات حرجة إضافية تتطلب نفس النمط (RPC + Transaction)

| العملية | الجداول المتأثرة معًا | القاعدة |
|---|---|---|
| اعتماد فاتورة شراء | `purchase_invoices` + `purchase_invoice_items` + `warehouse_stock` + `products.average_cost` + `stock_movements` | حساب المتوسط المرجّح يتم **داخل الدالة نفسها**، ليس بالفرونت إند |
| نقل بضاعة لمندوب | `warehouse_stock` (خصم) + `rep_inventory` (إضافة) + `stock_movements` (تسجيل) | تحقق أولًا من توفر الكمية بالمخزن المركزي، وإلا `RAISE EXCEPTION` |
| إصدار فاتورة بيع | `invoices` + `invoice_items` (مع `cost_price` snapshot) + `rep_inventory` (خصم) + `stock_movements` | `cost_price` يُقرأ من `products.average_cost` **وقت الفاتورة فقط** ويُحفظ ثابتًا |
| تسجيل تحصيل/دفعة مورد | `payments`/`supplier_payments` + تحديث `invoices.status`/`purchase_invoices.payment_status` | تحديث الحالة (paid/partial/unpaid) يتم تلقائيًا حسب مجموع الدفعات، وليس بإدخال يدوي منفصل |
| تسجيل مرتجع (Return) | `return_records` + `return_items` + (`rep_inventory` أو `stock_movements` فقط للتالف/المنتهي) + تسوية `invoices`/رصيد العميل | **المنطق الشرطي داخل الدالة:** لو `condition = resalable` → إضافة لـ `rep_inventory` + حركة `return_in`. لو `damaged`/`expired` → **بدون** أي إضافة لمخزون قابل للبيع، فقط حركة `write_off` موثّقة. التسوية المالية على حساب العميل تتم بنفس الدالة |
| إصدار فاتورة (تحويل وحدة + QR) | `invoices` + `invoice_items` + `rep_inventory` | تحويل `quantity_in_unit` إلى `quantity_in_base_unit` عبر `conversion_factor_to_base` **داخل الدالة**، وتوليد `invoice_number` التسلسلي و`qr_code_data` بنفس المعاملة — لا يجوز توليدهما بالفرونت إند |
| تعديل/إلغاء فاتورة بعد فترة السماح | `invoice_edit_requests` + (عند الموافقة) `credit_notes` + عكس أثر `rep_inventory`/`stock_movements` | **لا حذف مباشر للفاتورة الأصلية أبدًا** (راجع 4.5 أدناه) — التصحيح دائمًا عبر إشعار دائن مرتبط |

**ممنوع تمامًا** أي تعديل مباشر على `warehouse_stock.quantity_available` أو `rep_inventory.quantity_available` من الفرونت إند أو بـ `UPDATE` مباشر — **كل تغيير كمية يجب أن يمر عبر دالة RPC تكتب أيضًا سجل `stock_movements` بنفس الوقت**. هذا يضمن أن مجموع حركات `stock_movements` لأي منتج يطابق دائمًا رصيده الحالي (Auditability كاملة).

### 4.4 المفتاح السري (service_role key)
- `service_role key` **لا يظهر أبدًا في كود الفرونت إند أو في المتصفح**.
- يُستخدم فقط داخل Edge Functions أو Server Actions التي تعمل على السيرفر.
- الفرونت إند يتعامل دائمًا مع `anon key` + RLS policies تحكم الوصول.

### 4.5 قاعدة صارمة: الفواتير Append-Only (لأغراض الامتثال الضريبي / ZATCA)
- **ممنوع تنفيذ `DELETE` على جدول `invoices` نهائيًا** بعد الإصدار، ولو من لوحة تحكم الأدمن.
- `invoice_number` يُولَّد من **sequence واحد بقاعدة البيانات** (`CREATE SEQUENCE`)، وليس بحساب `COUNT(*)` أو منطق بالفرونت إند — لتفادي أي تكرار أو فجوة عند التزامن.
- أي تصحيح لفاتورة بعد فترة السماح (راجع `requirements.md` قسم 7.7) يتم **حصرًا** عبر `credit_notes` مرتبط بـ `invoice_id` الأصلي، وليس بتعديل حقول الفاتورة مباشرة.
- توليد `qr_code_data` (تنسيق TLV/Base64) يتم **داخل نفس RPC Function** التي تُنشئ الفاتورة، فور تحديد `invoice_number` النهائي والمبلغ الإجمالي — لا يجوز توليده لاحقًا أو من الفرونت إند.

---

## 5. الأمان (Security) — قواعد إلزامية

1. **Row Level Security مفعّل على كل جدول** بدون استثناء (راجع قسم 4.1).
2. **كل صلاحية دور** تُحدَّد عبر `custom claims` في JWT الخاص بـ Supabase Auth (`app_metadata.role`، مُزامَن تلقائيًا من `profiles.role` عبر trigger)، وتُتحقق منها كل Policy وكل Middleware.
   - الأدوار: `admin`, `accountant`, `rep` (تطبيق المندوب — مستقل تمامًا) + أدوار لوحة تحكم إضافية: `marketing`, `sales`, `production`, `supervisor`.
   - **نظام الصلاحيات (Permissions):** كل دور (عدا `admin`) له مجموعة صلاحيات ثابتة **مشتقة من الدور مباشرة** (case ثابتة داخل دالة `public.auth_has_permission(text)` بقاعدة البيانات) — وليست عمودًا/جدولًا منفصلًا قابلًا للتخصيص لكل مستخدم. المصدر الوحيد الملزم أمنيًا هو `auth_has_permission()`؛ نسخة مطابقة بالفرونت إند (`apps/admin/lib/permissions.ts`) **للعرض/الإخفاء فقط**، يجب إبقاؤها متطابقة يدويًا مع أي تعديل بقاعدة البيانات.
   - مفاتيح الصلاحيات: `manage_products`, `manage_warehouse`, `manage_purchases`, `manage_customers`, `manage_collections`, `manage_returns`, `manage_reps`, `manage_settings`, `view_reports`. آخر اثنين (`manage_reps`, `manage_settings`) حصرًا للأدمن ولا يُفوَّضان لأي دور آخر (إدارة المستخدمين وإعدادات النظام).
   - **ملاحظة تاريخية:** صلاحية `manage_invoice_requests` (مراجعة طلبات تعديل/إلغاء الفاتورة بعد "فترة سماح") حُذفت نهائيًا مع الميزة كاملة — كانت خاصة حصرًا بتطبيق المندوب المحذوف (`apps/rep`)، ولم يعد أي مسار بالكود ينشئ طلبات كهذي أصلًا. الإلغاء الآن (إن أُضيف مستقبلًا) فوري بلا فترة سماح أو موافقة منفصلة.
   - **`auth_is_staff()`** (بديل `auth_is_admin_or_accountant()` السابقة، بنفس الـ OID عبر `RENAME`): قراءة عامة (`SELECT`) لكل موظفي لوحة التحكم الداخليين — القراءة داخل النظام ليست حسّاسة كالكتابة. الكتابة (`INSERT/UPDATE/DELETE`) دائمًا عبر `auth_has_permission()` لكل جدول/RPC حسب مجاله.
   - **منع تصعيد الصلاحية الذاتي:** trigger `prevent_self_privilege_escalation` على `profiles` يمنع أي مستخدم (غير أدمن) من تعديل `role`/`is_active` الخاصين به عبر أي مسار (حتى لو تجاوز الواجهة)، رغم أن باقي أعمدة `profiles` (كالاسم) قابلة للتعديل الذاتي.
3. **التحقق من الصلاحيات على مستويين:** الفرونت (لإخفاء عناصر الواجهة فقط) + قاعدة البيانات (RLS/RPC، وهي خط الدفاع الحقيقي — لا تثق بالفرونت إند أبدًا). **تنبيه مهم:** أي Server Action تستخدم `service_role` (`createSupabaseAdminClient`، مثل إنشاء مستخدم أو تغيير كلمة مرور مستخدم آخر) **تتجاوز RLS بالكامل** — التحقق من الصلاحية داخل الـ Action نفسها **إلزامي صراحةً** بهذي الحالة تحديدًا، وليس كافيًا الاعتماد على إخفاء الزر بالواجهة.
4. **كل Input من المستخدم يُتحقق منه بـ Zod** قبل إرساله لأي عملية — سواء فورم أو Edge Function.
5. **لا أسرار (API keys, DB passwords) في الكود مطلقًا.** كل شيء في متغيرات بيئة (`.env`) و`.env.example` فقط يحتوي أسماء المتغيرات بدون قيم حقيقية. `.env` داخل `.gitignore` دائمًا.
6. **سجل تدقيق (Audit Log):** جدول `audit_logs` يسجل كل عملية حساسة (تعديل فاتورة، حذف، تسجيل دفعة، تغيير رصيد مخزون مندوب) مع: من نفّذها، متى، القيمة قبل/بعد.
7. **Rate Limiting:** على أي Edge Function تتعامل مع بيانات حساسة (تسجيل الدخول تحديدًا) لمنع هجمات Brute Force.
8. **HTTPS إجباري في كل مكان** — Railway و Supabase يوفرانه افتراضيًا، لا تعطّله.
9. **فحص الاعتماديات (Dependencies):** تفعيل Dependabot على GitHub لتنبيهات الثغرات الأمنية في المكتبات تلقائيًا.
10. **عدم الثقة بأي بيانات قادمة من `rep` app** — المندوب تطبيقه بالجوال وأكثر عرضة للتلاعب (جهاز مفتوح، شبكة عامة)، فكل تحقق حرج (توفر المخزون، صلاحية العميل) يُعاد التحقق منه في قاعدة البيانات وليس فقط بالواجهة.

---

## 6. معايير الكود ونظافته (Code Standards)

### 6.1 عام
- **TypeScript Strict Mode** مفعّل في كل تطبيق (`"strict": true` في tsconfig) — ممنوع استخدام `any` إلا بمبرر موثّق بتعليق.
- **ESLint + Prettier** بإعداد موحّد من `packages/config` عبر كل التطبيقات.
- **Husky + lint-staged:** فحص lint وformat تلقائي قبل كل commit — لا يُسمح بـ commit يحتوي أخطاء lint.

### 6.2 تسمية الملفات والمجلدات
- الملفات: `kebab-case` → `invoice-form.tsx`, `calculate-vat.ts`
- المكونات (React Components): `PascalCase` داخل الملف → `export function InvoiceForm()`
- الدوال والمتغيرات: `camelCase`
- الجداول وأعمدة قاعدة البيانات: `snake_case`

### 6.3 بنية المكوّنات (Component Structure)
- **مكوّن واحد = مسؤولية واحدة.** أي مكوّن يتجاوز ~150 سطر يُعاد تقسيمه.
- فصل منطق البيانات (data fetching, mutations) عن منطق العرض (UI) — استخدام `Server Components` لجلب البيانات و`Client Components` فقط للتفاعل.
- لا "God Components" تسوي كل شي (fetch + validate + render + submit) بنفس الملف.

### 6.4 التحقق من البيانات (Validation)
كل نموذج بيانات (فاتورة، منتج، عميل...) له **Zod Schema واحدة** في `packages/validation`، تُستخدم:
- في الفورم (Client-side، لتجربة مستخدم فورية)
- في Server Action / Edge Function (Server-side، **هذا هو التحقق الحقيقي والملزم**)

```typescript
// packages/validation/invoice.ts
export const invoiceItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(invoiceItemSchema).min(1),
  paymentMethod: z.enum(['cash', 'credit', 'check', 'transfer']),
});
```

### 6.5 معالجة الأخطاء (Error Handling)
- لا `try/catch` فارغ أو يبتلع الخطأ بصمت.
- رسائل خطأ للمستخدم بالعربي وواضحة ("الكمية غير متوفرة" وليس "Error 500").
- تسجيل الأخطاء التقنية (logging) بشكل منفصل عن الرسالة المعروضة للمستخدم.

### 6.6 التعليقات والتوثيق
- تعليق فقط لشرح "ليش" وليس "شنو" (الكود نفسه يشرح شنو يسوي إذا كان نظيف).
- كل `packages/` له `README.md` مختصر يشرح الغرض منه وكيفية الاستخدام.
- كل Postgres Function معقدة تُوثَّق بتعليق SQL يشرح المنطق.

---

## 7. Git Workflow (حتى مع مطور واحد)

- **Branch رئيسي:** `main` — دائمًا قابل للنشر (deployable)، لا commit مباشر عليه.
- **Feature branches:** `feature/invoice-creation`, `fix/rep-stock-bug` — تُدمج بـ Pull Request حتى لو المطور نفسه يراجعها (تفرض توقف وتفكير قبل الدمج).
- **Conventional Commits إجباري:**
  ```
  feat(rep): إضافة صفحة إصدار فاتورة ميدانية
  fix(admin): تصحيح حساب ضريبة القيمة المضافة
  chore(deps): تحديث Next.js إلى 14.2
  security(db): إضافة RLS policy مفقودة لجدول payments
  ```
- **لا commit بدون رسالة واضحة بالعربي أو الإنجليزي تشرح "ليش"، مو بس "شنو".**

---

## 8. CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)
يعمل تلقائيًا على كل Pull Request:
1. `pnpm install`
2. `pnpm lint` — يفشل الـ pipeline لو في أخطاء lint
3. `pnpm typecheck` — يفشل لو في أخطاء TypeScript
4. `pnpm test` — Vitest (unit tests)
5. (لاحقًا) `pnpm test:e2e` — Playwright على المسارات الحرجة فقط

### النشر (Deployment)
- كل تطبيق (`admin`, `rep`, `store`) = **خدمة Railway منفصلة**، تُنشر تلقائيًا عند merge إلى `main`.
- متغيرات البيئة تُدار من لوحة Railway مباشرة (لا تُكتب بالكود مطلقًا).
- Supabase Migrations تُدار عبر Supabase CLI ويُحتفظ بها في `packages/database/migrations` بشكل مرقّم ومتسلسل (Versioned).

---

## 9. الاختبارات (Testing)

النظام لا يحتاج تغطية اختبارات 100%، لكن **المسارات الحرجة إلزامية الاختبار**:

| المسار | نوع الاختبار | لماذا حرج |
|---|---|---|
| إصدار فاتورة + خصم مخزون المندوب | Unit + Integration | خطأ هنا = بيانات مالية خاطئة |
| حساب ضريبة القيمة المضافة | Unit | خطأ هنا = فاتورة غير قانونية |
| تسجيل تحصيل / تحديث كشف حساب عميل | Unit + Integration | خطأ هنا = فقدان أموال أو دين خاطئ |
| تسجيل الدخول والصلاحيات (RLS) | Integration | خطأ هنا = ثغرة أمنية كاملة |
| رصيد المخزون (مندوب أو مركزي) لا يذهب سالبًا | Unit | يمنع بيع/نقل بضاعة غير موجودة |
| احتساب متوسط التكلفة المرجّح عند الشراء | Unit | خطأ هنا = تقارير ربح خاطئة بالكامل |
| نقل بضاعة من المخزن للمندوب (خصم/إضافة متزامنين) | Unit + Integration | خطأ هنا = فقدان تتبع البضاعة |
| تطابق مجموع `stock_movements` مع الرصيد الفعلي | Integration | يضمن سلامة سجل التدقيق (Audit Trail) |
| حساب الربح الصافي (سعر بيع - `cost_price` المحفوظ) | Unit | مباشرة يؤثر على تقارير الإدارة المالية |
| مرتجع "سليم" يرجع فعليًا لرصيد المندوب | Unit + Integration | خطأ هنا = فقدان بضاعة قابلة للبيع |
| مرتجع "تالف/منتهي" **لا** يرجع أبدًا لمخزون قابل للبيع | Unit | خطأ هنا = بيع بضاعة تالفة لعميل — خطر مباشر على سمعة الشركة |
| التسوية المالية للمرتجع تنعكس صح على دين/رصيد العميل | Integration | خطأ هنا = حسابات عملاء خاطئة |
| `invoice_number` تسلسلي بدون فجوات حتى مع تزامن عالي | Integration | متطلب قانوني إلزامي (ZATCA) — أي فجوة = مخالفة |
| تحويل الوحدات (كرتون → قطعة) صحيح بكل العمليات | Unit | خطأ هنا = أرصدة مخزون وتكاليف خاطئة بالكامل |

---

## 10. قواعد عامة لـ Claude Code عند العمل على هذا المستودع

1. **اقرأ `requirements.md` قبل أي تنفيذ** لفهم المتطلبات الوظيفية الكاملة.
2. **لا تنفّذ عملية حرجة (فاتورة/مخزون/شراء/نقل/دفع) مباشرة من الفرونت إند** — استخدم Postgres RPC Function دائمًا.
2.1. **لا تكتب `UPDATE` مباشر على `warehouse_stock` أو `rep_inventory`** — أي تغيير كمية يمر حصرًا عبر دالة RPC تُحدّث الرصيد **وتكتب `stock_movements` بنفس المعاملة (transaction)**.
3. **لا تنشئ جدول بدون RLS Policies** واضحة لكل دور.
4. **لا تكرر كود بين التطبيقات الثلاث** — انقله لـ `packages/`.
5. **قبل إضافة مكتبة جديدة، اسأل: هل فعلًا نحتاجها أم موجود بديل بسيط داخل الستاك الحالي؟**
6. **اكتب Commit messages بصيغة Conventional Commits.**
7. **أي قرار تقني جديد غير موجود بهذا الملف، وثّقه هنا فور اتخاذه** — هذا الملف مرجع حي.
8. **قاعدة بيانات Supabase الفعلية (Production) لا تُدار عبر Supabase CLI حاليًا بهذا المشروع** — أي تحديث بالكود يحتاج تغييرًا بقاعدة البيانات (جدول/عمود/دالة/RLS/View/سياسة جديدة أو معدّلة) **يجب أن يُرفق دائمًا بملف SQL منفصل** يُرسَل للمستخدم لتشغيله يدويًا بـ Supabase SQL Editor، بالإضافة لملف الـ migration بـ `packages/database/migrations` كالمعتاد. لو التحديث لا يحتاج أي تغيير بقاعدة البيانات، صرّح بذلك صراحة ("لا يوجد تحديث مطلوب بسوبابيس لهذا التغيير") بدل السكوت عن الموضوع. لا تفترض إطلاقًا أن قاعدة البيانات الفعلية مطابقة لملفات الـ migrations بالمستودع.

---

*هذا الملف حي ويُحدَّث باستمرار مع تطور المشروع.*
