-- ========== السلات المتروكة: تتبّع سلات المتجر التي لم تتحوّل لطلب ==========
-- السلة نفسها بالكامل client-side (localStorage، راجع apps/store/lib/cart-context.tsx)
-- ولا يصل أي أثر لها لقاعدة البيانات قبل هذه الميزة. أول نقطة تماس حقيقية مع
-- الخادم هي صفحة /checkout عند إدخال رقم الجوال (identifyStoreCustomerAction)
-- — من هنا تُلتقط لقطة (snapshot) لبنود السلة وقتها. لو أكمل العميل الطلب
-- فعليًا (placeOrderAction) تُوسَم اللقطة "محوّلة" بدل حذفها (سجل تاريخي).
-- تنبيه نطاق متعمّد: لا يلتقط زائرًا ملأ سلة ولم يصل لصفحة /checkout إطلاقًا
-- (لا هوية معروفة عنه بعد) — هذا متوافق مع كون المتجر بلا حسابات زوار حقيقية.
create table public.store_cart_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  items jsonb not null,
  subtotal numeric(10, 2) not null default 0,
  last_activity_at timestamptz not null default now(),
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- سلة مفتوحة واحدة فقط (غير محوّلة) لكل عميل بأي وقت — قيد دفاعي فقط، منطق
-- التطبيق أصلًا يبحث عن السلة المفتوحة الحالية ويحدّثها بدل تكرارها.
create unique index store_cart_sessions_open_unique
  on public.store_cart_sessions (customer_id)
  where converted_at is null;

create index store_cart_sessions_last_activity_idx
  on public.store_cart_sessions (last_activity_at desc);

create trigger set_updated_at before update on public.store_cart_sessions
  for each row execute function public.set_updated_at();

-- الكتابة (إنشاء/تحديث/تحويل) حصرًا عبر service_role من Server Actions
-- بتطبيق المتجر (يتجاوز RLS بالكامل، راجع CLAUDE.md §5.3) — لا policy لأي
-- عملية INSERT/UPDATE/DELETE هنا. القراءة فقط لموظفي لوحة التحكم.
alter table public.store_cart_sessions enable row level security;

create policy "store_cart_sessions_select_staff"
on public.store_cart_sessions for select
using (public.auth_is_staff());
