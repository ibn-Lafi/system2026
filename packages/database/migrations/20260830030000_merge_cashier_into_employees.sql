-- ========== دمج "موظف الكاشير" داخل جدول الموظفين (employees) الموحّد ==========
-- بطلب المستخدم: بدل جدول/صفحة منفصلة (cashier_employees بصفحة الإعدادات)،
-- تصير صلاحية الكاشير (وPIN الخاص بها) حقلًا اختياريًا بنفس نموذج إضافة/تعديل
-- الموظف بصفحة الموارد البشرية (/hr/employees) — كل كاشير هو موظف حقيقي
-- بسجل واحد، بدل هويتين منفصلتين لنفس الشخص.

alter table public.employees add column if not exists is_cashier boolean not null default false;
alter table public.employees add column if not exists cashier_pin_hash text;

-- ترحيل بيانات: أي صف قائم بـ cashier_employees يصير صف موظف جديد بنفس الـ id
-- (يحافظ على مرجع invoices.cashier_employee_id القائم بلا كسر) — hire_date
-- إلزامي بجدول employees وليس له مقابل بـcashier_employees، فنستخدم تاريخ
-- اليوم كقيمة افتراضية معقولة لموظفي كاشير أُنشئوا سابقًا بالمسار القديم.
insert into public.employees (id, full_name, hire_date, is_cashier, cashier_pin_hash, is_active)
select id, name, current_date, true, pin_hash, is_active
from public.cashier_employees
on conflict (id) do nothing;

alter table public.invoices drop constraint if exists invoices_cashier_employee_id_fkey;
alter table public.invoices
  add constraint invoices_cashier_employee_id_fkey
  foreign key (cashier_employee_id) references public.employees (id);

drop table if exists public.cashier_employees;

drop function if exists public.create_cashier_employee(text, text);
drop function if exists public.reset_cashier_employee_pin(uuid, text);
drop function if exists public.set_cashier_employee_active(uuid, boolean);

-- تعيين/إعادة تعيين رمز PIN الخاص بموظف ككاشير (يتطلب manage_hr — نفس صلاحية
-- صفحة الموظفين التي يعيش بها الحقل الآن). لا تتحقق من is_cashier هنا عمدًا:
-- الفورم يرسل الرمز ويُفعّل is_cashier بنفس العملية (تحديث عادي على العمود
-- عبر RLS، لا حاجة RPC لحقل بسيط بلا تشفير).
create function public.set_employee_cashier_pin(p_employee_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.auth_has_permission('manage_hr') then
    raise exception 'ليست لديك صلاحية إدارة رمز الكاشير للموظفين';
  end if;
  if p_pin is null or length(p_pin) < 4 then
    raise exception 'رمز PIN يجب أن يكون 4 أرقام على الأقل';
  end if;

  update public.employees
  set cashier_pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = p_employee_id;
end;
$$;

drop function if exists public.verify_cashier_employee_pin(uuid, text);
create function public.verify_cashier_employee_pin(p_employee_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return exists (
    select 1 from public.employees
    where id = p_employee_id
      and is_cashier = true
      and is_active = true
      and cashier_pin_hash is not null
      and cashier_pin_hash = crypt(p_pin, cashier_pin_hash)
  );
end;
$$;

-- create_cashier_sale: نفس المنطق بالضبط، فقط التحقق من الموظف الآن على
-- employees (is_cashier + is_active) بدل جدول cashier_employees المحذوف.
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
  if not exists (
    select 1 from public.employees
    where id = p_employee_id and is_cashier = true and is_active = true
  ) then
    raise exception 'الموظف غير معروف أو غير مفعّل ككاشير';
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
