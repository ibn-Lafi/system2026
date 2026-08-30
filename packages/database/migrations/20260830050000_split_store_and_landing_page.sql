-- ========== فصل صفحة الهبوط عن المتجر: كل منهما تطبيق مستقل بدومين خاص ==========
-- كانت الصفحة الرئيسية بالمتجر (apps/store) تتبدّل بين عرض المنتجات وصفحة
-- هبوط ثابتة (حملة "وش تتمنى يكون عندنا؟") عبر عمود show_landing_page.
-- صفحة الهبوط الآن تطبيق مستقل بالكامل (apps/landing) بخدمة/دومين خاص به،
-- فلا حاجة لهذا التبديل إطلاقًا — المتجر يعرض المنتجات دائمًا.
drop view if exists public.public_store_settings;

alter table public.store_settings
  drop column if exists show_landing_page;

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
  custom_html
from public.store_settings
where id = 1;

grant select on public.public_store_settings to anon, authenticated;
