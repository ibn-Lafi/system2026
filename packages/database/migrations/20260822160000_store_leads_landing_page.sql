-- ========== وضع صفحة الهبوط بالصفحة الرئيسية للمتجر ==========
-- يسمح للأدمن بالتبديل بين عرض المتجر العادي (المنتجات) وعرض صفحة هبوط
-- تجمع بيانات الزوار المهتمين فقط — دون فقدان أي من الوضعين.
alter table public.store_settings
  add column if not exists show_landing_page boolean not null default false;

drop view if exists public.public_store_settings;
create view public.public_store_settings
with (security_invoker = false) as
select
  store_name,
  logo_url,
  hero_kicker,
  hero_title,
  site_description,
  whatsapp_number,
  instagram_url,
  tiktok_url,
  show_points_of_sale_section,
  custom_css,
  custom_html,
  show_landing_page
from public.store_settings
where id = 1;

grant select on public.public_store_settings to anon, authenticated;

-- ========== store_leads: بيانات الزوار المهتمين من صفحة الهبوط ==========
-- أول جدول بالنظام يسمح بـ INSERT عام (anon) مباشرة — بيانات ترحيبية غير
-- حساسة (رقم جوال + نص حر)، وليست جزءًا من أي عملية مالية أو تشغيلية.
create table public.store_leads (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null check (phone_number ~ '^\+9665[0-9]{8}$'),
  desired_store text not null,
  created_at timestamptz not null default now()
);

alter table public.store_leads enable row level security;

create policy "store_leads_insert_public"
on public.store_leads for insert
to anon
with check (true);

create policy "store_leads_select_authenticated"
on public.store_leads for select
to authenticated
using (true);
-- لا UPDATE/DELETE بهذه المرحلة.
