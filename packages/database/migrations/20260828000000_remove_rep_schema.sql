-- ========== إزالة كل ما يخص "المندوب" من مخطط قاعدة البيانات نهائيًا ==========
-- تطبيق المندوب (apps/rep) حُذف بالكامل من الكود، والنظام سينتقل لاحقًا من
-- B2B (مبيعات عبر مناديب ميدانيين) إلى B2C. هذه الـ migration تحذف كل جدول/
-- عمود/دالة/سياسة RLS كانت موجودة حصرًا لخدمة نموذج المندوب، وتُبقي كل شيء
-- عام آخر يعمل كما هو (فقط بدون بُعد المندوب).
--
-- ملاحظة معمارية مهمة: بما أن "المندوب" كان هو الفاعل الوحيد الذي يُصدر
-- فواتير بيع (create_invoice_with_stock_check) ويطلب تعديلها بعد فترة
-- السماح (request_invoice_edit)، وبما أن admin لا يُصدر فواتير بيع حاليًا
-- (يصدر فواتير شراء للموردين فقط)، فقد أصبحت هذه الدوال معطّلة تمامًا (لا
-- مستدعي لها بالكود بعد حذف apps/rep). أعدنا تصميم نموذج الصلاحية:
--   • create_invoice_with_stock_check و cancel_invoice_within_grace_period:
--     أُبقيتا (منطقهما المالي/المخزوني عام وليس خاصًا بالمندوب) لكن أُزيل
--     منهما مفهوم "صاحب الفاتورة = مندوب" بالكامل — الآن للأدمن حصرًا
--     (يمكن توسيعها لاحقًا بصلاحية مخصصة عند بناء نظام B2C).
--   • request_invoice_edit: حُذفت نهائيًا — كانت الأداة الوحيدة لغير-الأدمن
--     لطلب إذن تعديل فاتورة، ولا معنى لها الآن بما أن الأدمن يملك صلاحية
--     الإلغاء المباشرة دائمًا. review_invoice_edit_request وجدول
--     invoice_edit_requests بقيا كما هما (لا ضرر من إبقائهما، قد يُستخدمان
--     مستقبلًا بتصميم صلاحيات مختلف).
--   • process_return و record_customer_payment: أُبقيتا بمنطقهما الكامل،
--     فقط أُزيل فرع التفويض الخاص بالمندوب (auth_is_rep()/customer_reps).

-- ========== 1) حذف سياسات RLS المرتبطة بالمندوب على جداول ستبقى ==========
-- (السياسات على الجداول التي سنحذفها بالكامل بالخطوة التالية تُحذف تلقائيًا
-- مع الجدول، فلا داعي لحذفها هنا صراحة)
drop policy if exists "customers_select_own_rep" on public.customers;
drop policy if exists "customers_insert_rep" on public.customers;
drop policy if exists "warehouse_stock_select_rep" on public.warehouse_stock;
drop policy if exists "invoices_select_own_rep" on public.invoices;
drop policy if exists "invoice_items_select_own_rep" on public.invoice_items;
drop policy if exists "invoice_edit_requests_insert_own_rep" on public.invoice_edit_requests;
drop policy if exists "credit_notes_select_own_rep" on public.credit_notes;
drop policy if exists "payments_select_own_rep" on public.payments;
drop policy if exists "customer_branches_select_own_rep" on public.customer_branches;
drop policy if exists "return_records_select_own_rep" on public.return_records;
drop policy if exists "return_items_select_own_rep" on public.return_items;
drop policy if exists "stock_movements_select_own_rep" on public.stock_movements;

-- ========== 2) حذف الجداول الخاصة حصرًا بالمندوب ==========
-- غير مستخدمة من أي مسار بالكود منذ نموذج المخزن الموحّد (راجع migration
-- 20260813140000_single_warehouse_model.sql) أو أصلًا (customer_reps).
drop table if exists public.customer_reps;
drop table if exists public.rep_inventory;
drop table if exists public.stock_transfer_items;
drop table if exists public.stock_transfers;

-- ========== 3) حذف الدوال الخاصة حصرًا بالمندوب ==========
drop function if exists public.transfer_stock_to_rep(uuid, jsonb);
drop function if exists public.request_invoice_edit(uuid, text, jsonb);
drop function if exists public.create_invoice_with_stock_check(
  uuid, uuid, jsonb, public.invoice_payment_method, numeric, uuid, text
);

-- ========== 4) إعادة إنشاء create_invoice_with_stock_check بدون مفهوم المندوب ==========
-- نفس المنطق المالي/المخزوني الحالي بالضبط (فحص التوفر، حساب الضريبة من
-- سعر شامل الضريبة، الخصم، الفرع، الملاحظات، رقم الفاتورة التسلسلي، QR)
-- فقط بدون p_rep_id — الأدمن حصرًا يصدر الفاتورة الآن.
create function public.create_invoice_with_stock_check(
  p_customer_id uuid,
  p_items jsonb, -- [{product_id, unit_id, quantity_in_unit}, ...]
  p_payment_method public.invoice_payment_method,
  p_discount_percentage numeric default 0,
  p_branch_id uuid default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_unit_id uuid;
  v_quantity_in_unit numeric;
  v_conversion_factor numeric;
  v_quantity_in_base numeric;
  v_list_price numeric;
  v_gross_unit_price numeric;
  v_unit_price numeric;
  v_cost_price numeric;
  v_available numeric;
  v_subtotal numeric := 0;
  v_vat_amount numeric;
  v_total_amount numeric;
  v_invoice_id uuid := gen_random_uuid();
  v_invoice_number bigint;
  v_qr text;
  v_settings public.system_settings;
  v_now timestamptz := now();
begin
  if not public.auth_is_admin() then
    raise exception 'غير مصرح لك بإصدار فاتورة';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'يجب إضافة بند واحد على الأقل للفاتورة';
  end if;

  if p_discount_percentage is null or p_discount_percentage < 0 or p_discount_percentage > 25 then
    raise exception 'نسبة الخصم يجب أن تكون بين 0%% و 25%%';
  end if;

  if p_branch_id is not null and not exists (
    select 1 from public.customer_branches
    where id = p_branch_id and customer_id = p_customer_id
  ) then
    raise exception 'الفرع المحدد لا يتبع هذا العميل';
  end if;

  select * into v_settings from public.system_settings where id = 1;

  -- 1. تحقق أن كل الكميات المطلوبة متوفرة بالمخزون المشترك (بالوحدة
  --    الأساسية) قبل أي تعديل فعلي — راجع النمط الإلزامي بـ CLAUDE.md §4.3
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_unit_id := (v_item ->> 'unit_id')::uuid;
    v_quantity_in_unit := (v_item ->> 'quantity_in_unit')::numeric;

    if v_quantity_in_unit is null or v_quantity_in_unit <= 0 then
      raise exception 'الكمية يجب أن تكون أكبر من صفر';
    end if;

    select conversion_factor_to_base into v_conversion_factor
    from public.product_units
    where product_id = v_product_id and unit_id = v_unit_id;

    if v_conversion_factor is null then
      select 1 into v_conversion_factor
      from public.products
      where id = v_product_id and base_unit_id = v_unit_id;
    end if;

    if v_conversion_factor is null then
      raise exception 'الوحدة المختارة غير مرتبطة بهذا المنتج';
    end if;

    v_quantity_in_base := v_quantity_in_unit * v_conversion_factor;

    select quantity_available into v_available
    from public.warehouse_stock
    where product_id = v_product_id
    for update;

    if v_available is null or v_available < v_quantity_in_base then
      raise exception 'الكمية غير متوفرة بالمخزون لمنتج %', v_product_id;
    end if;
  end loop;

  -- 2. حساب المجاميع: سعر الكتالوج الحقيقي (من قاعدة البيانات، وليس من
  --    العميل) شامل الضريبة، مطروحًا منه نسبة الخصم أولًا، ثم استخراج
  --    السعر الصافي وضريبته من داخل نفس المبلغ (gross / 1.15).
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_unit_id := (v_item ->> 'unit_id')::uuid;
    v_quantity_in_unit := (v_item ->> 'quantity_in_unit')::numeric;

    select coalesce(pu.unit_price, p.price * pu.conversion_factor_to_base, p.price)
      into v_list_price
    from public.products p
    left join public.product_units pu on pu.product_id = p.id and pu.unit_id = v_unit_id
    where p.id = v_product_id;

    v_gross_unit_price := round(v_list_price * (1 - p_discount_percentage / 100), 2);
    v_unit_price := round(v_gross_unit_price / 1.15, 2);
    v_subtotal := v_subtotal + (v_quantity_in_unit * v_unit_price);
  end loop;
  v_vat_amount := round(v_subtotal * 0.15, 2);
  v_total_amount := v_subtotal + v_vat_amount;

  v_invoice_number := nextval('public.invoice_number_seq');
  v_qr := public.generate_zatca_qr(
    coalesce(v_settings.company_name, ''),
    coalesce(v_settings.vat_registration_number, ''),
    v_now,
    v_total_amount,
    v_vat_amount
  );

  insert into public.invoices (
    id, invoice_number, customer_id, invoice_date,
    subtotal, vat_amount, total_amount, qr_code_data, payment_method, status,
    discount_percentage, branch_id, notes
  ) values (
    v_invoice_id, v_invoice_number, p_customer_id, v_now,
    v_subtotal, v_vat_amount, v_total_amount, v_qr, p_payment_method,
    case when p_payment_method = 'credit' then 'unpaid'::public.invoice_status else 'paid'::public.invoice_status end,
    p_discount_percentage, p_branch_id, nullif(trim(p_notes), '')
  );

  -- 3. بنود الفاتورة + خصم المخزون المشترك + حركة مخزون sale_out (كلها بنفس الـ transaction)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_unit_id := (v_item ->> 'unit_id')::uuid;
    v_quantity_in_unit := (v_item ->> 'quantity_in_unit')::numeric;

    select conversion_factor_to_base into v_conversion_factor
    from public.product_units
    where product_id = v_product_id and unit_id = v_unit_id;
    v_conversion_factor := coalesce(v_conversion_factor, 1);
    v_quantity_in_base := v_quantity_in_unit * v_conversion_factor;

    select coalesce(pu.unit_price, p.price * pu.conversion_factor_to_base, p.price)
      into v_list_price
    from public.products p
    left join public.product_units pu on pu.product_id = p.id and pu.unit_id = v_unit_id
    where p.id = v_product_id;
    v_gross_unit_price := round(v_list_price * (1 - p_discount_percentage / 100), 2);
    v_unit_price := round(v_gross_unit_price / 1.15, 2);

    select average_cost into v_cost_price from public.products where id = v_product_id;

    insert into public.invoice_items (
      invoice_id, product_id, unit_id, quantity_in_unit, quantity_in_base_unit,
      unit_price, cost_price, subtotal
    ) values (
      v_invoice_id, v_product_id, v_unit_id, v_quantity_in_unit, v_quantity_in_base,
      v_unit_price, coalesce(v_cost_price, 0), v_quantity_in_unit * v_unit_price
    );

    update public.warehouse_stock
    set quantity_available = quantity_available - v_quantity_in_base
    where product_id = v_product_id
    returning quantity_available into v_available;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'sale_out', 'invoices', v_invoice_id, v_product_id,
      'warehouse', null, -v_quantity_in_base, v_available, auth.uid()
    );
  end loop;

  return v_invoice_id;
end;
$$;

-- ========== 5) إعادة إنشاء cancel_invoice_within_grace_period بدون ملكية المندوب ==========
-- كانت تسمح فقط لصاحب الفاتورة (المندوب) بإلغائها؛ الآن الأدمن حصرًا.
create or replace function public.cancel_invoice_within_grace_period(
  p_invoice_id uuid,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
  v_settings public.system_settings;
  v_item record;
  v_warehouse_qty numeric;
  v_credit_note_id uuid := gen_random_uuid();
begin
  if not public.auth_is_admin() then
    raise exception 'غير مصرح لك بإلغاء فاتورة';
  end if;

  select * into v_invoice from public.invoices where id = p_invoice_id;
  if v_invoice is null then
    raise exception 'الفاتورة غير موجودة';
  end if;
  if v_invoice.status = 'cancelled' then
    raise exception 'الفاتورة ملغاة مسبقًا';
  end if;
  -- منع الإلغاء الكامل لفاتورة سبق تسجيل مرتجع عليها: الإلغاء يعيد كامل
  -- كمية invoice_items للرصيد بدون علم بما أُرجع مسبقًا عبر process_return،
  -- ما يسبب ازدواج إضافة نفس الكمية للمخزون (Double-counting).
  if exists (select 1 from public.return_records where invoice_id = p_invoice_id) then
    raise exception 'لا يمكن إلغاء فاتورة سبق تسجيل مرتجع عليها — التصحيح يتم عبر طلب تعديل للأدمن';
  end if;

  select * into v_settings from public.system_settings where id = 1;
  if now() > v_invoice.invoice_date + make_interval(mins => v_settings.invoice_edit_grace_period_minutes) then
    raise exception 'انتهت فترة السماح — يلزم إرسال طلب موافقة للأدمن';
  end if;

  -- إعادة الكمية للمخزون المشترك + حركة مخزون return_in لكل بند
  for v_item in
    select product_id, quantity_in_base_unit from public.invoice_items where invoice_id = p_invoice_id
  loop
    update public.warehouse_stock
    set quantity_available = quantity_available + v_item.quantity_in_base_unit
    where product_id = v_item.product_id
    returning quantity_available into v_warehouse_qty;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'return_in', 'invoices', p_invoice_id, v_item.product_id,
      'warehouse', null, v_item.quantity_in_base_unit, v_warehouse_qty, auth.uid()
    );
  end loop;

  insert into public.credit_notes (id, invoice_id, amount, reason, created_by)
  values (v_credit_note_id, p_invoice_id, v_invoice.total_amount, p_reason, auth.uid());

  update public.invoices set status = 'cancelled' where id = p_invoice_id;

  return v_credit_note_id;
end;
$$;

-- ========== 6) إعادة إنشاء process_return بدون معامل/عمود المندوب ==========
drop function if exists public.process_return(uuid, uuid, uuid, jsonb);

create function public.process_return(
  p_customer_id uuid,
  p_invoice_id uuid,
  p_items jsonb -- [{product_id, quantity, unit_price, condition}, ...]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_condition public.return_condition;
  v_total_credit numeric := 0;
  v_return_id uuid := gen_random_uuid();
  v_warehouse_qty numeric;
begin
  if not public.auth_has_permission('manage_returns') then
    raise exception 'غير مصرح لك بتسجيل مرتجع';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'يجب إضافة بند واحد على الأقل بالمرتجع';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_total_credit := v_total_credit
      + ((v_item ->> 'quantity')::numeric * (v_item ->> 'unit_price')::numeric);
  end loop;

  insert into public.return_records (
    id, invoice_id, customer_id, total_credit_amount, created_by
  ) values (
    v_return_id, p_invoice_id, p_customer_id, v_total_credit, auth.uid()
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unit_price')::numeric;
    v_condition := (v_item ->> 'condition')::public.return_condition;

    insert into public.return_items (return_id, product_id, quantity, unit_price, condition)
    values (v_return_id, v_product_id, v_quantity, v_unit_price, v_condition);

    if v_condition = 'resalable' then
      insert into public.warehouse_stock (product_id, quantity_available)
      values (v_product_id, v_quantity)
      on conflict (product_id)
      do update set quantity_available = public.warehouse_stock.quantity_available + excluded.quantity_available
      returning quantity_available into v_warehouse_qty;

      insert into public.stock_movements (
        movement_type, reference_table, reference_id, product_id,
        location_type, location_id, quantity_change, balance_after, performed_by
      ) values (
        'return_in', 'return_records', v_return_id, v_product_id,
        'warehouse', null, v_quantity, v_warehouse_qty, auth.uid()
      );
    else
      -- تالف/منتهي الصلاحية: خسارة موثّقة بدون أي إضافة لمخزون قابل للبيع.
      insert into public.stock_movements (
        movement_type, reference_table, reference_id, product_id,
        location_type, location_id, quantity_change, balance_after, performed_by
      ) values (
        'write_off', 'return_records', v_return_id, v_product_id,
        'warehouse', null, -v_quantity, coalesce((
          select quantity_available from public.warehouse_stock where product_id = v_product_id
        ), 0), auth.uid()
      );
    end if;
  end loop;

  -- التسوية المالية على حساب العميل: إن وُجدت فاتورة أصلية آجلة، تُخصم
  -- قيمة المرتجع من دينها تلقائيًا عبر نفس منطق التحصيل.
  if p_invoice_id is not null and v_total_credit > 0 then
    perform public.record_customer_payment(p_customer_id, p_invoice_id, v_total_credit, 'cash');
  end if;

  return v_return_id;
end;
$$;

-- ========== 7) إعادة إنشاء record_customer_payment بدون فرع تفويض المندوب ==========
create or replace function public.record_customer_payment(
  p_customer_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_method public.settlement_method
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid := gen_random_uuid();
  v_invoice_total numeric;
  v_paid_total numeric;
begin
  if not public.auth_has_permission('manage_collections') then
    raise exception 'غير مصرح لك بتسجيل تحصيل لهذا العميل';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'قيمة التحصيل يجب أن تكون أكبر من صفر';
  end if;

  insert into public.payments (id, invoice_id, customer_id, amount, method, recorded_by)
  values (v_payment_id, p_invoice_id, p_customer_id, p_amount, p_method, auth.uid());

  if p_invoice_id is not null then
    select total_amount into v_invoice_total from public.invoices where id = p_invoice_id;
    select coalesce(sum(amount), 0) into v_paid_total
    from public.payments where invoice_id = p_invoice_id;

    update public.invoices
    set status = case
      when v_paid_total >= v_invoice_total then 'paid'::public.invoice_status
      when v_paid_total > 0 then 'partial'::public.invoice_status
      else 'unpaid'::public.invoice_status
    end
    where id = p_invoice_id and status <> 'cancelled';
  end if;

  return v_payment_id;
end;
$$;

-- ========== 8) حذف عمودي rep_id من الجداول العامة ==========
alter table public.invoices drop column if exists rep_id;
alter table public.return_records drop column if exists rep_id;

-- ========== 9) حذف auth_is_rep() — لم يعد لها أي مستدعٍ بعد الخطوات أعلاه ==========
drop function if exists public.auth_is_rep();

-- ========== 10) قيمة افتراضية آمنة لدور مستخدم جديد بدون دور محدد ==========
-- كانت 'rep' افتراضيًا (تطبيق محذوف الآن) — 'accountant' أقل صلاحية متاحة
-- كإجراء احترازي؛ عمليًا هذا المسار لا يُستخدم لأن صفحة إدارة المستخدمين
-- تمرر الدور دائمًا صراحة.
alter table public.profiles alter column role set default 'accountant';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'accountant')
  );
  return new;
end;
$$;

-- ملاحظة: قيمة 'rep' تبقى ضمن enum بـ user_role/stock_location_type — لا
-- تدعم PostgreSQL حذف قيمة enum إلا بإعادة إنشاء النوع بالكامل (عملية أكثر
-- خطورة تمس عمود profiles.role نفسه)، والقيمة تبقى غير مستخدمة عمليًا بعد
-- هذا التغيير (لا صف سيحمل role='rep' مستقبلًا من أي مسار بالتطبيق).
