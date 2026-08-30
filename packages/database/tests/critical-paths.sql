-- اختبار تكامل شامل للمسارات الحرجة (راجع CLAUDE.md §9). يطبَّق بعد migrations/
-- على قاعدة بيانات اختبار فارغة، ويفشل (exit code != 0) عند أي RAISE EXCEPTION.
-- هذا ليس Mock — يُنفَّذ فعليًا على Postgres حقيقي بنفس مخطط الإنتاج.
--
-- ملاحظة: النظام يستخدم مخزون مشترك واحد (warehouse_stock) — لا يوجد "رصيد
-- مخزون خاص بكل مندوب" (rep_inventory) ولا نظام نقل بضاعة، ولا مفهوم
-- "مندوب" إطلاقًا بعد إزالة تطبيق المندوب (apps/rep) وتنظيف قاعدة البيانات
-- منه بالكامل — الأدمن هو الفاعل الوحيد لكل العمليات المالية/المخزونية.
--
-- ملاحظة تقنية: psql لا يستبدل متغيراته (:'name') داخل نصوص $$...$$ (DO
-- blocks/دوال)، لذلك أي تحقق يحتاج متغيّر psql (مثل invoice_id الناتج من
-- \gset) يُكتب كاستدعاء SELECT مباشر لدالة pg_temp.assert_true أدناه، وليس
-- داخل DO block.

\set ON_ERROR_STOP on

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not p_condition or p_condition is null then
    raise exception 'FAILED: %', p_message;
  end if;
end;
$$;

-- ========== الإعداد ==========
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.local', '{"name":"Admin One","role":"admin"}');

select pg_temp.assert_true(
  (select count(*) from public.profiles where role = 'admin') = 1,
  'trigger on_auth_user_created لم ينشئ profile للأدمن'
);
select pg_temp.assert_true(
  (select email from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'admin@test.local',
  'trigger on_auth_user_created لم ينسخ email من auth.users (تسجيل الدخول أصبح بالبريد)'
);

update public.system_settings
set company_name = 'شركة الاختبار', vat_registration_number = '300000000000003'
where id = 1;

set request.jwt.uid = '11111111-1111-1111-1111-111111111111';
set request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"admin"}}';

insert into public.units (id, name) values
  ('a1111111-0000-0000-0000-000000000001', 'قطعة'),
  ('a1111111-0000-0000-0000-000000000002', 'كرتون');
insert into public.categories (id, name) values ('c1111111-0000-0000-0000-000000000001', 'مشروبات');
insert into public.products (id, name, price, category_id, base_unit_id, visible_in_store)
values ('b1111111-0000-0000-0000-000000000001', 'عصير برتقال', 5.00,
        'c1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', true);
insert into public.product_units (product_id, unit_id, conversion_factor_to_base)
values ('b1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000002', 24);
insert into public.suppliers (id, name) values ('d1111111-0000-0000-0000-000000000001', 'مورد تجريبي');

-- ========== 1. المتوسط المرجّح (requirements.md §5.4) ==========
select public.create_purchase_invoice(
  'd1111111-0000-0000-0000-000000000001',
  jsonb_build_array(jsonb_build_object(
    'product_id', 'b1111111-0000-0000-0000-000000000001',
    'unit_id', 'a1111111-0000-0000-0000-000000000002',
    'quantity_in_unit', 10, 'unit_cost', 100
  )), 'unpaid'
);

select pg_temp.assert_true(
  (select round(average_cost, 4) from public.products where id = 'b1111111-0000-0000-0000-000000000001') = 4.1667,
  'متوسط التكلفة بعد أول شراء يجب أن يكون 4.1667'
);
select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock where product_id = 'b1111111-0000-0000-0000-000000000001') = 240,
  'رصيد المخزون المشترك بعد أول شراء يجب أن يكون 240'
);

select public.create_purchase_invoice(
  'd1111111-0000-0000-0000-000000000001',
  jsonb_build_array(jsonb_build_object(
    'product_id', 'b1111111-0000-0000-0000-000000000001',
    'unit_id', 'a1111111-0000-0000-0000-000000000002',
    'quantity_in_unit', 5, 'unit_cost', 120
  )), 'paid'
);

select pg_temp.assert_true(
  (select round(average_cost, 4) from public.products where id = 'b1111111-0000-0000-0000-000000000001') = 4.4445,
  'متوسط التكلفة بعد شراء ثانٍ بسعر مختلف يجب أن يكون 4.4445'
);
select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock where product_id = 'b1111111-0000-0000-0000-000000000001') = 360,
  'رصيد المخزون المشترك بعد شراءين يجب أن يكون 360'
);

insert into public.customers (id, name, shop_name, show_in_store, google_maps_link)
values ('e1111111-0000-0000-0000-000000000001', 'عميل تجريبي', 'محل الاختبار', true, 'https://maps.google.com/xyz');

-- ========== 2. فاتورة بيع + VAT 15% + خصم مباشر من المخزون المشترك (requirements.md §7.3/§7.5) ==========
select public.create_invoice_with_stock_check(
  'e1111111-0000-0000-0000-000000000001',
  jsonb_build_array(jsonb_build_object(
    'product_id', 'b1111111-0000-0000-0000-000000000001',
    'unit_id', 'a1111111-0000-0000-0000-000000000001',
    'quantity_in_unit', 20
  )), 'credit'
) as invoice_id \gset invoice1_

select pg_temp.assert_true(
  (select invoice_number from public.invoices where id = :'invoice1_invoice_id') = 1,
  'invoice_number الأول يجب أن يكون 1'
);
select pg_temp.assert_true(
  (select (subtotal, vat_amount, total_amount) = (87, 13.05, 100.05)
     from public.invoices where id = :'invoice1_invoice_id'),
  -- سعر المنتج 5 شامل الضريبة (راجع migration 20260816090000): صافي
  -- الوحدة = 5/1.15 = 4.35، × 20 = 87 subtotal، والضريبة 13.05، والإجمالي
  -- 100.05 (يطابق 20×5 تقريبًا، وليس 100+15%)
  'مجاميع الفاتورة (subtotal/vat/total) يجب أن تكون 87/13.05/100.05 (سعر شامل الضريبة)'
);
select pg_temp.assert_true(
  (select status from public.invoices where id = :'invoice1_invoice_id') = 'unpaid',
  'حالة فاتورة آجلة عند الإصدار يجب أن تكون unpaid'
);
select pg_temp.assert_true(
  (select length(qr_code_data) > 0 from public.invoices where id = :'invoice1_invoice_id'),
  'qr_code_data يجب ألا يكون فارغًا'
);
select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock
    where product_id = 'b1111111-0000-0000-0000-000000000001') = 340,
  'رصيد المخزون المشترك بعد بيع 20 قطعة يجب أن يكون 340 (360-20)'
);

-- ========== 3. رفض بيع كمية أكبر من المتاح (requirements.md §7.3) ==========
do $$
begin
  perform public.create_invoice_with_stock_check(
    'e1111111-0000-0000-0000-000000000001',
    jsonb_build_array(jsonb_build_object(
      'product_id', 'b1111111-0000-0000-0000-000000000001',
      'unit_id', 'a1111111-0000-0000-0000-000000000001',
      'quantity_in_unit', 99999
    )), 'cash'
  );
  raise exception 'كان يجب رفض بيع كمية أكبر من المتوفر بالمخزون';
exception
  when others then
    if sqlerrm = 'كان يجب رفض بيع كمية أكبر من المتوفر بالمخزون' then
      raise exception 'FAILED: %', sqlerrm;
    end if;
    -- أي استثناء آخر متوقع من create_invoice_with_stock_check نفسها — هذا صحيح
end $$;

-- ========== 4. تحصيل جزئي/كامل يحدّث حالة الفاتورة تلقائيًا (requirements.md §11) ==========
select public.record_customer_payment(
  'e1111111-0000-0000-0000-000000000001', :'invoice1_invoice_id', 50, 'cash'
);
select pg_temp.assert_true(
  (select status from public.invoices where id = :'invoice1_invoice_id') = 'partial',
  'حالة الفاتورة بعد تحصيل جزئي يجب أن تكون partial'
);

select public.record_customer_payment(
  'e1111111-0000-0000-0000-000000000001', :'invoice1_invoice_id', 65, 'cash'
);
select pg_temp.assert_true(
  (select status from public.invoices where id = :'invoice1_invoice_id') = 'paid',
  'حالة الفاتورة بعد اكتمال التحصيل يجب أن تكون paid'
);

-- ========== 5. مرتجع: سليم يرجع للمخزون المشترك، تالف يُسجَّل خسارة فقط (requirements.md §10.2) ==========
select public.process_return(
  'e1111111-0000-0000-0000-000000000001',
  :'invoice1_invoice_id',
  jsonb_build_array(
    jsonb_build_object('product_id', 'b1111111-0000-0000-0000-000000000001', 'quantity', 5, 'unit_price', 5, 'condition', 'resalable'),
    jsonb_build_object('product_id', 'b1111111-0000-0000-0000-000000000001', 'quantity', 2, 'unit_price', 5, 'condition', 'damaged')
  )
);

select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock
    where product_id = 'b1111111-0000-0000-0000-000000000001') = 345,
  'رصيد المخزون المشترك بعد المرتجع يجب أن يكون 345 (340+5 سليم، بدون التالف)'
);
select pg_temp.assert_true(
  (select quantity_change from public.stock_movements where movement_type = 'write_off' limit 1) = -2,
  'حركة write_off يجب أن تسجّل الكمية الفعلية المفقودة (-2) وليس صفر'
);

-- ========== 6. منع ازدواج إعادة المخزون: لا إلغاء لفاتورة سبق إرجاعها ==========
-- invoice1 أُرجع جزء منها بالقسم 5 (process_return). لو سمحنا بإلغائها كاملة
-- الآن، cancel_invoice كانت سترجّع كامل الكمية الأصلية (20) للمخزون فوق
-- الكمية المُرجعة أصلًا (5) — ازدواج توثّق. يجب أن تُرفض العملية.
-- ملاحظة: psql لا يستبدل متغيراته داخل $$...$$، لذلك p_invoice_id يُمرَّر
-- كوسيط عادي لدالة pg_temp (يُستبدل بشكل صحيح باستدعاء SELECT مباشر).
create function pg_temp.assert_cancel_is_rejected(p_invoice_id uuid, p_reason text)
returns void language plpgsql as $$
begin
  perform public.cancel_invoice(p_invoice_id, p_reason);
  raise exception 'FAILED: كان يجب رفض إلغاء فاتورة سبق تسجيل مرتجع عليها';
exception
  when others then
    if sqlerrm = 'FAILED: كان يجب رفض إلغاء فاتورة سبق تسجيل مرتجع عليها' then
      raise;
    end if;
    -- الاستثناء المتوقع من الدالة نفسها — هذا صحيح
end;
$$;

select pg_temp.assert_cancel_is_rejected(:'invoice1_invoice_id', 'محاولة إلغاء بعد مرتجع');

select pg_temp.assert_true(
  (select status from public.invoices where id = :'invoice1_invoice_id') = 'paid',
  'حالة الفاتورة الأولى يجب ألا تتغيّر بعد رفض محاولة الإلغاء'
);
select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock
    where product_id = 'b1111111-0000-0000-0000-000000000001') = 345,
  'رصيد المخزون المشترك يجب ألا يتأثر بمحاولة الإلغاء المرفوضة (يبقى 345)'
);

-- ========== 6.1 إلغاء فاتورة فوري بنجاح (فاتورة جديدة بلا مرتجعات) ==========
select public.create_invoice_with_stock_check(
  'e1111111-0000-0000-0000-000000000001',
  jsonb_build_array(jsonb_build_object(
    'product_id', 'b1111111-0000-0000-0000-000000000001',
    'unit_id', 'a1111111-0000-0000-0000-000000000001',
    'quantity_in_unit', 4
  )), 'cash'
) as invoice_id \gset invoice3_

select public.cancel_invoice(:'invoice3_invoice_id', 'خطأ إدخال');

select pg_temp.assert_true(
  (select status from public.invoices where id = :'invoice3_invoice_id') = 'cancelled',
  'حالة الفاتورة الثالثة بعد الإلغاء يجب أن تكون cancelled'
);
select pg_temp.assert_true(
  (select count(*) from public.credit_notes where invoice_id = :'invoice3_invoice_id') = 1,
  'يجب إنشاء إشعار دائن واحد بالضبط عند الإلغاء'
);
select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock
    where product_id = 'b1111111-0000-0000-0000-000000000001') = 345,
  'رصيد المخزون المشترك يجب أن يعود 345 (بيع 4 ثم إلغاء يعيدها بالضبط)'
);

-- ========== 6.2 نسبة خصم الفاتورة (0%-25%) — تُحسب داخل قاعدة البيانات ولا تُقرأ من العميل ==========
-- unit_price لم يعد جزءًا من العقد؛ السعر الحقيقي يُقرأ من products.price
-- ويُطبَّق عليه الخصم داخل create_invoice_with_stock_check نفسها.
select public.create_invoice_with_stock_check(
  'e1111111-0000-0000-0000-000000000001',
  jsonb_build_array(jsonb_build_object(
    'product_id', 'b1111111-0000-0000-0000-000000000001',
    'unit_id', 'a1111111-0000-0000-0000-000000000001',
    'quantity_in_unit', 4
  )), 'cash', 25
) as invoice_id \gset invoice5_

select pg_temp.assert_true(
  (select discount_percentage from public.invoices where id = :'invoice5_invoice_id') = 25,
  'نسبة الخصم المحفوظة بالفاتورة يجب أن تكون 25'
);
select pg_temp.assert_true(
  (select (subtotal, vat_amount, total_amount) = (13.04, 1.96, 15.00)
     from public.invoices where id = :'invoice5_invoice_id'),
  -- سعر 5 شامل الضريبة، بعد خصم 25% = 3.75 (شامل) للوحدة — يُستخرج منها
  -- صافي 3.75/1.15 = 3.26، × 4 = 13.04 subtotal، وضريبة 1.96، وإجمالي 15.00
  -- (يطابق 4×3.75 تمامًا، وهو السعر الذي يدفعه العميل فعليًا)
  'مع خصم 25% على سعر 5 شامل الضريبة: صافي 3.26 × 4 = 13.04، والضريبة 1.96، والإجمالي 15.00'
);
select pg_temp.assert_true(
  (select unit_price from public.invoice_items where invoice_id = :'invoice5_invoice_id') = 3.26,
  'سعر الوحدة الصافي المحفوظ ببند الفاتورة (3.75 شامل بعد الخصم ÷ 1.15 = 3.26)'
);

do $$
begin
  perform public.create_invoice_with_stock_check(
    'e1111111-0000-0000-0000-000000000001',
    jsonb_build_array(jsonb_build_object(
      'product_id', 'b1111111-0000-0000-0000-000000000001',
      'unit_id', 'a1111111-0000-0000-0000-000000000001',
      'quantity_in_unit', 1
    )), 'cash', 26
  );
  raise exception 'كان يجب رفض نسبة خصم أكبر من 25%%';
exception
  when others then
    if sqlerrm = 'كان يجب رفض نسبة خصم أكبر من 25%' then
      raise exception 'FAILED: %', sqlerrm;
    end if;
    -- الاستثناء المتوقع من create_invoice_with_stock_check نفسها — هذا صحيح
end $$;

-- ========== 7. لا يمكن لغير الأدمن إصدار/إلغاء فاتورة أو تسجيل مرتجع ==========
-- بعد إزالة تطبيق المندوب، الأدمن هو الفاعل الوحيد المخوَّل بهذه العمليات
-- الحرجة ماليًا/مخزونيًا (راجع migration 20260828000000_remove_rep_schema).
reset role;
set request.jwt.uid = '11111111-1111-1111-1111-111111111111';
set request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"accountant"}}';

do $$
begin
  perform public.create_invoice_with_stock_check(
    'e1111111-0000-0000-0000-000000000001',
    jsonb_build_array(jsonb_build_object(
      'product_id', 'b1111111-0000-0000-0000-000000000001',
      'unit_id', 'a1111111-0000-0000-0000-000000000001',
      'quantity_in_unit', 1
    )), 'cash'
  );
  raise exception 'FAILED: كان يجب رفض إصدار فاتورة من غير الأدمن';
exception
  when others then
    if sqlerrm = 'FAILED: كان يجب رفض إصدار فاتورة من غير الأدمن' then
      raise;
    end if;
    -- الاستثناء المتوقع من الدالة نفسها — هذا صحيح
end $$;

-- ========== 8. هوية عميل موحّدة + كاشير + طلب متجر إلكتروني ==========
reset role;
set request.jwt.uid = '11111111-1111-1111-1111-111111111111';
set request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"admin"}}';

insert into public.products (id, name, price, category_id, base_unit_id, visible_in_store)
values ('b2222222-0000-0000-0000-000000000001', 'منتج كاشير تجريبي', 11.50,
        'c1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', true);
insert into public.warehouse_stock (product_id, quantity_available)
values ('b2222222-0000-0000-0000-000000000001', 50);

select public.find_or_create_customer_by_phone('+966501111111', 'زبون كاشير') as cust1_id \gset
select public.find_or_create_customer_by_phone('+966501111111', 'اسم مختلف يجب تجاهله') as cust1_id_again \gset

select pg_temp.assert_true(
  :'cust1_id' = :'cust1_id_again',
  'find_or_create_customer_by_phone لم يرجّع نفس العميل لنفس رقم الجوال'
);
select pg_temp.assert_true(
  (select count(*) from public.customers where phone = '+966501111111') = 1,
  'find_or_create_customer_by_phone أنشأ أكثر من عميل لنفس رقم الجوال (كسر uniqueness)'
);

insert into public.employees (full_name, hire_date, is_cashier)
values ('موظف كاشير 1', current_date, true)
returning id as employee1_id \gset

select public.set_employee_cashier_pin(:'employee1_id', '1234');

select pg_temp.assert_true(
  (select is_active and is_cashier from public.employees where id = :'employee1_id') = true,
  'الموظف يجب أن يكون نشطًا وكاشيرًا بعد الإنشاء وتعيين الرمز'
);
select pg_temp.assert_true(
  public.verify_cashier_employee_pin(:'employee1_id'::uuid, '1234') = true,
  'verify_cashier_employee_pin لم يتحقق من PIN الصحيح'
);
select pg_temp.assert_true(
  public.verify_cashier_employee_pin(:'employee1_id'::uuid, '9999') = false,
  'verify_cashier_employee_pin يجب أن يرجّع false لـPIN خاطئ'
);

select public.create_cashier_sale(
  :'employee1_id', :'cust1_id',
  jsonb_build_array(jsonb_build_object('product_id', 'b2222222-0000-0000-0000-000000000001', 'quantity', 3)),
  'cash'
) as cashier_sale_id \gset

select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock where product_id = 'b2222222-0000-0000-0000-000000000001') = 47,
  'create_cashier_sale لم يخصم المخزون بشكل صحيح'
);
select pg_temp.assert_true(
  (select sale_channel from public.invoices where id = :'cashier_sale_id') = 'cashier',
  'create_cashier_sale لم يسجّل sale_channel=cashier'
);
select pg_temp.assert_true(
  (select cashier_employee_id from public.invoices where id = :'cashier_sale_id') = :'employee1_id'::uuid,
  'create_cashier_sale لم يسجّل الموظف الذي أصدر الفاتورة'
);
select pg_temp.assert_true(
  (select total_amount from public.invoices where id = :'cashier_sale_id') = 34.50,
  'إجمالي فاتورة الكاشير غير صحيح (متوقع 34.50 لـ3 قطع بسعر 11.50 شامل الضريبة)'
);
select pg_temp.assert_true(
  (select loyalty_points from public.customers where id = :'cust1_id') = 3,
  'create_cashier_sale لم يحتسب نقاط الولاء تلقائيًا بشكل صحيح (متوقع 3 نقاط لإجمالي 34.50 بمعدل 10 ريال/نقطة)'
);

do $$
begin
  perform public.create_cashier_sale(
    (select id from public.employees where full_name = 'موظف كاشير 1' and is_cashier = true),
    (select id from public.customers where phone = '+966501111111'),
    jsonb_build_array(jsonb_build_object('product_id', 'b2222222-0000-0000-0000-000000000001', 'quantity', 1000)),
    'cash'
  );
  raise exception 'FAILED: كان يجب رفض بيع كمية أكبر من المتاح بالكاشير';
exception
  when others then
    if sqlerrm = 'FAILED: كان يجب رفض بيع كمية أكبر من المتاح بالكاشير' then
      raise;
    end if;
end $$;

update public.employees set is_active = false where full_name = 'موظف كاشير 1' and is_cashier = true;

do $$
begin
  perform public.create_cashier_sale(
    (select id from public.employees where full_name = 'موظف كاشير 1' and is_cashier = true),
    (select id from public.customers where phone = '+966501111111'),
    jsonb_build_array(jsonb_build_object('product_id', 'b2222222-0000-0000-0000-000000000001', 'quantity', 1)),
    'cash'
  );
  raise exception 'FAILED: كان يجب رفض البيع من موظف كاشير معطّل';
exception
  when others then
    if sqlerrm = 'FAILED: كان يجب رفض البيع من موظف كاشير معطّل' then
      raise;
    end if;
end $$;

select public.find_or_create_customer_by_phone('+966502222222', 'زبون متجر') as store_cust_id \gset

select public.create_online_store_order(
  :'store_cust_id',
  jsonb_build_array(jsonb_build_object('product_id', 'b2222222-0000-0000-0000-000000000001', 'quantity', 2))
) as store_order_id \gset

select pg_temp.assert_true(
  (select sale_channel from public.invoices where id = :'store_order_id') = 'online_store',
  'create_online_store_order لم يسجّل sale_channel=online_store'
);
select pg_temp.assert_true(
  (select status from public.invoices where id = :'store_order_id') = 'unpaid',
  'طلب المتجر يجب أن يبقى غير مسدد حتى التحصيل الفعلي (دفع عند الاستلام)'
);
select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock where product_id = 'b2222222-0000-0000-0000-000000000001') = 45,
  'create_online_store_order لم يخصم المخزون بشكل صحيح'
);

insert into public.products (id, name, price, category_id, base_unit_id, visible_in_store)
values ('b2222222-0000-0000-0000-000000000002', 'منتج غير معروض بالمتجر', 20.00,
        'c1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', false);
insert into public.warehouse_stock (product_id, quantity_available)
values ('b2222222-0000-0000-0000-000000000002', 10);

do $$
begin
  perform public.create_online_store_order(
    (select id from public.customers where phone = '+966502222222'),
    jsonb_build_array(jsonb_build_object('product_id', 'b2222222-0000-0000-0000-000000000002', 'quantity', 1))
  );
  raise exception 'FAILED: كان يجب رفض طلب منتج غير معروض بالمتجر';
exception
  when others then
    if sqlerrm = 'FAILED: كان يجب رفض طلب منتج غير معروض بالمتجر' then
      raise;
    end if;
end $$;

do $$
begin
  perform public.create_online_store_order(
    (select id from public.customers where phone = '+966502222222'),
    jsonb_build_array(jsonb_build_object('product_id', 'b2222222-0000-0000-0000-000000000001', 'quantity', 9999))
  );
  raise exception 'FAILED: كان يجب رفض طلب متجر بكمية أكبر من المتاح';
exception
  when others then
    if sqlerrm = 'FAILED: كان يجب رفض طلب متجر بكمية أكبر من المتاح' then
      raise;
    end if;
end $$;

-- ========== 9. RLS لكل دور (CLAUDE.md §4-5) ==========
reset role;
set request.jwt.uid = '11111111-1111-1111-1111-111111111111';
set request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"admin"}}';
set role authenticated;

select pg_temp.assert_true(
  (select count(*) from public.suppliers) = 1,
  'الأدمن يجب أن يرى كل الموردين (RLS)'
);

reset role;
set request.jwt.claims = '';
set role anon;

select pg_temp.assert_true(
  (select count(*) from public.customers) = 0,
  'anon لا يجب أن يصل لجدول customers مباشرة إطلاقًا (RLS)'
);
select pg_temp.assert_true(
  (select count(*) from public.employees) = 0,
  'anon لا يجب أن يصل لجدول employees (بيانات كاشير/رواتب) إطلاقًا (RLS)'
);
select pg_temp.assert_true(
  (select count(*) from public.public_store_locations) = 1,
  'anon يجب أن يرى نقطة البيع الظاهرة عبر public_store_locations'
);
select pg_temp.assert_true(
  (select count(*) from public.public_products) = 2,
  'anon يجب أن يرى المنتجات الظاهرة بالمتجر عبر public_products (الأصلي + منتج الكاشير التجريبي)'
);

reset role;

\echo '✓ كل اختبارات المسارات الحرجة نجحت'
