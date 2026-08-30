-- تحويل الكاشير من "حاوية/جهاز" (PIN عام مشترك بلا هوية) إلى "موظف كاشير":
-- كل رمز PIN يمثّل شخصًا بعينه — عند فتح الكاشير يختار الموظف اسمه من قائمة
-- ثم يدخل رقمه الخاص، وكل عملية بيع تُنسب لذاك الموظف تحديدًا (تدقيق كامل).
--
-- إصلاح إضافي: الدوال السابقة (create_cashier_terminal/verify_cashier_terminal_pin)
-- استخدمت crypt()/gen_salt() بدون تأهيل schema مع `set search_path = public`
-- فقط — بمشاريع Supabase الفعلية يكون امتداد pgcrypto مثبَّتًا مسبقًا بـschema
-- "extensions" وليس "public"، فتفشل الدالة بخطأ "function crypt(...) does not
-- exist". الإصلاح: `set search_path = public, extensions` بكل دالة تستخدم
-- crypt/gen_salt، يعمل بكلا الحالتين (محليًا وبسوبابيس الفعلي).

-- ========== 1) إعادة تسمية الجدول (نفس البنية، دلالة مختلفة) ==========
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'cashier_terminals') then
    alter table public.cashier_terminals rename to cashier_employees;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cashier_employees' and policyname = 'cashier_terminals_select_staff'
  ) then
    alter policy "cashier_terminals_select_staff" on public.cashier_employees rename to "cashier_employees_select_staff";
  end if;
end $$;

-- التأكد من وجود Policy بالاسم الجديد حتى لو كان هذا أول تشغيل نظيف (بدون
-- إعادة تسمية سابقة) — احترازًا.
drop policy if exists "cashier_employees_select_staff" on public.cashier_employees;
create policy "cashier_employees_select_staff"
on public.cashier_employees for select
using (public.auth_is_staff());

-- ========== 2) ربط الفاتورة بالموظف الذي أصدرها (تدقيق) ==========
alter table public.invoices
  add column if not exists cashier_employee_id uuid references public.cashier_employees (id);

-- ========== 3) الدوال — بأسماء/معاملات جديدة + إصلاح search_path ==========
drop function if exists public.create_cashier_terminal(text, text);
create function public.create_cashier_employee(p_name text, p_pin text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if not public.auth_has_permission('manage_settings') then
    raise exception 'ليست لديك صلاحية إدارة موظفي الكاشير';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'اسم الموظف مطلوب';
  end if;
  if p_pin is null or length(p_pin) < 4 then
    raise exception 'رمز PIN يجب أن يكون 4 أرقام على الأقل';
  end if;

  insert into public.cashier_employees (name, pin_hash)
  values (btrim(p_name), crypt(p_pin, gen_salt('bf')))
  returning id into v_id;

  return v_id;
end;
$$;

drop function if exists public.reset_cashier_terminal_pin(uuid, text);
create function public.reset_cashier_employee_pin(p_employee_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.auth_has_permission('manage_settings') then
    raise exception 'ليست لديك صلاحية إدارة موظفي الكاشير';
  end if;
  if p_pin is null or length(p_pin) < 4 then
    raise exception 'رمز PIN يجب أن يكون 4 أرقام على الأقل';
  end if;

  update public.cashier_employees
  set pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = p_employee_id;
end;
$$;

drop function if exists public.set_cashier_terminal_active(uuid, boolean);
create function public.set_cashier_employee_active(p_employee_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_has_permission('manage_settings') then
    raise exception 'ليست لديك صلاحية إدارة موظفي الكاشير';
  end if;

  update public.cashier_employees set is_active = p_is_active where id = p_employee_id;
end;
$$;

drop function if exists public.verify_cashier_terminal_pin(text);
-- الموظف يختار اسمه أولًا بشاشة الدخول ثم يدخل رقمه — التحقق هنا محصور
-- بنفس الموظف المختار (وليس مسحًا لكل الموظفين)، ويرجّع true/false فقط.
create function public.verify_cashier_employee_pin(p_employee_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return exists (
    select 1 from public.cashier_employees
    where id = p_employee_id and is_active = true and pin_hash = crypt(p_pin, pin_hash)
  );
end;
$$;

-- ========== 4) بيع الكاشير: p_employee_id بدل p_terminal_id + تسجيله بالفاتورة ==========
drop function if exists public.create_cashier_sale(uuid, uuid, jsonb, public.invoice_payment_method);
create function public.create_cashier_sale(
  p_employee_id uuid,
  p_customer_id uuid,
  p_items jsonb, -- [{product_id, quantity}, ...] بالوحدة الأساسية للمنتج
  p_payment_method public.invoice_payment_method
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
  v_base_unit_id uuid;
  v_points integer;
  v_new_balance integer;
begin
  if not exists (select 1 from public.cashier_employees where id = p_employee_id and is_active = true) then
    raise exception 'الموظف غير معروف أو غير مفعّل';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'يجب إضافة منتج واحد على الأقل للبيع';
  end if;

  select * into v_settings from public.system_settings where id = 1;

  -- 1. تحقق من توفر الكمية بالمخزون المشترك قبل أي تعديل فعلي
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'الكمية يجب أن تكون أكبر من صفر';
    end if;

    select quantity_available into v_available
    from public.warehouse_stock
    where product_id = v_product_id
    for update;

    if v_available is null or v_available < v_quantity then
      raise exception 'الكمية غير متوفرة بالمخزون لمنتج %', v_product_id;
    end if;
  end loop;

  -- 2. حساب المجاميع من سعر الكتالوج الحقيقي (شامل الضريبة) — بدون خصم
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    select round(price / 1.15, 2) into v_unit_price from public.products where id = v_product_id;
    v_subtotal := v_subtotal + (v_quantity * v_unit_price);
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
    discount_percentage, branch_id, notes, sale_channel, cashier_employee_id
  ) values (
    v_invoice_id, v_invoice_number, p_customer_id, v_now,
    v_subtotal, v_vat_amount, v_total_amount, v_qr, p_payment_method,
    case when p_payment_method = 'credit' then 'unpaid'::public.invoice_status else 'paid'::public.invoice_status end,
    0, null, null, 'cashier', p_employee_id
  );

  -- 3. بنود الفاتورة + خصم المخزون + حركة مخزون sale_out
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    select round(price / 1.15, 2), average_cost, base_unit_id
      into v_unit_price, v_cost_price, v_base_unit_id
    from public.products where id = v_product_id;

    insert into public.invoice_items (
      invoice_id, product_id, unit_id, quantity_in_unit, quantity_in_base_unit,
      unit_price, cost_price, subtotal
    ) values (
      v_invoice_id, v_product_id, v_base_unit_id, v_quantity, v_quantity,
      v_unit_price, coalesce(v_cost_price, 0), v_quantity * v_unit_price
    );

    update public.warehouse_stock
    set quantity_available = quantity_available - v_quantity
    where product_id = v_product_id
    returning quantity_available into v_available;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'sale_out', 'invoices', v_invoice_id, v_product_id,
      'warehouse', null, -v_quantity, v_available, null
    );
  end loop;

  -- 4. احتساب نقاط الولاء تلقائيًا (بنفس المعاملة)
  v_points := floor(v_total_amount / v_settings.loyalty_riyals_per_point);
  if v_points > 0 then
    update public.customers
    set loyalty_points = loyalty_points + v_points
    where id = p_customer_id
    returning loyalty_points into v_new_balance;

    insert into public.loyalty_point_movements (customer_id, points_change, balance_after, reason)
    values (p_customer_id, v_points, v_new_balance, 'فاتورة كاشير رقم ' || v_invoice_number);
  end if;

  return v_invoice_id;
end;
$$;
