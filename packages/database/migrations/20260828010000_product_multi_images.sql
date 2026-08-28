-- دعم حتى 5 صور لكل منتج بدل صورة واحدة فقط.
-- image_url (الحالي) يبقى كما هو دون أي تغيير في معناه أو استخدامه — يُقرأ
-- ويُكتب كـ "الصورة الرئيسية" (أول صورة بالمصفوفة) لضمان توافق كامل مع
-- المتجر العام (apps/store) وأي مكان آخر يعرض صورة واحدة فقط، بدون أي حاجة
-- لتعديل تلك الأماكن. image_urls الجديد يخزّن كل الصور المرفوعة بالترتيب.
alter table public.products
  add column image_urls text[] not null default '{}'::text[];

alter table public.products
  add constraint products_image_urls_max_5
  check (array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 5);
