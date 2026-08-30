-- توحيد هوية العميل من نقطتين (كاشير + متجر إلكتروني) + تطبيق كاشير جديد.
-- الفكرة: رقم الجوال هو المفتاح الموحّد للعميل بغض النظر عن قناة أول تواصل
-- معه؛ RPC واحدة مشتركة (find_or_create_customer_by_phone) تُستخدم من كل
-- من apps/cashier وapps/store لضمان عدم تكرار سجل العميل.
--
-- ملاحظة أمنية مهمة (راجع CLAUDE.md §5.3 بند 3): كل الدوال أدناه المخصّصة
-- للكاشير والمتجر الإلكتروني تُستدعى حصرًا عبر service_role من Server
-- Actions (لا جلسة Supabase Auth حقيقية بأي منهما)، لذلك هي عمدًا بلا فحص
-- auth_has_permission/auth_is_admin داخلي — خط الدفاع هو طبقة التطبيق نفسها
-- (تحقق PIN بالكاشير، وإعادة التحقق من الأسعار/المخزون من القاعدة نفسها
-- بالمتجر لأنه مسار عام anon).
--
-- تبسيط متعمّد: بنود البيع بهاتين الدالتين {product_id, quantity} بالوحدة
-- الأساسية للمنتج فقط (بدون اختيار وحدة/تحويل كرتون↔قطعة كما بفاتورة
-- الأدمن) — يناسب واجهة "كاشير/منيو" سريعة، ويمكن التوسعة لاحقًا لو احتجنا
-- بيع بالكرتون من الكاشير.

-- ========== 1) هوية عميل موحّدة برقم الجوال ==========
create unique index customers_phone_unique on public.customers (phone) where phone is not null;

create or replace function public.find_or_create_customer_by_phone(
  p_phone text,
  p_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  if p_phone is null or btrim(p_phone) = '' then
    raise exception 'رقم الجوال مطلوب';
  end if;

  select id into v_customer_id from public.customers where phone = p_phone;
  if v_customer_id is not null then
    return v_customer_id;
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'الاسم مطلوب لتسجيل عميل جديد';
  end if;

  insert into public.customers (name, phone, show_in_store)
  values (btrim(p_name), p_phone, false)
  returning id into v_customer_id;

  return v_customer_id;
end;
$$;

-- ========== 2) معدّل نقاط الولاء التلقائي ==========
alter table public.system_settings
  add column loyalty_riyals_per_point numeric(10, 2) not null default 10
  check (loyalty_riyals_per_point > 0);

-- ========== 3) حاويات الكاشير (أجهزة نقطة بيع) ==========
create table public.cashier_terminals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.cashier_terminals
  for each row execute function public.set_updated_at();

alter table public.cashier_terminals enable row level security;

-- لا Policy لـ INSERT/UPDATE عمدًا — الإدارة حصرًا عبر RPCs أدناه
-- (manage_settings)، والتحقق من الـPIN عبر service_role (يتجاوز RLS أصلًا).
create policy "cashier_terminals_select_staff"
on public.cashier_terminals for select
using (public.auth_is_staff());

create or replace function public.create_cashier_terminal(p_name text, p_pin text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.auth_has_permission('manage_settings') then
    raise exception 'ليست لديك صلاحية إدارة حاويات الكاشير';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'اسم الحاوية مطلوب';
  end if;
  if p_pin is null or length(p_pin) < 4 then
    raise exception 'رمز PIN يجب أن يكون 4 أرقام على الأقل';
  end if;

  insert into public.cashier_terminals (name, pin_hash)
  values (btrim(p_name), crypt(p_pin, gen_salt('bf')))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.reset_cashier_terminal_pin(p_terminal_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_has_permission('manage_settings') then
    raise exception 'ليست لديك صلاحية إدارة حاويات الكاشير';
  end if;
  if p_pin is null or length(p_pin) < 4 then
    raise exception 'رمز PIN يجب أن يكون 4 أرقام على الأقل';
  end if;

  update public.cashier_terminals
  set pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = p_terminal_id;
end;
$$;

create or replace function public.set_cashier_terminal_active(p_terminal_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_has_permission('manage_settings') then
    raise exception 'ليست لديك صلاحية إدارة حاويات الكاشير';
  end if;

  update public.cashier_terminals set is_active = p_is_active where id = p_terminal_id;
end;
$$;

-- يُستدعى من apps/cashier عبر service_role عند إدخال الموظف رمز الـPIN.
create or replace function public.verify_cashier_terminal_pin(p_pin text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_terminal_id uuid;
begin
  select id into v_terminal_id
  from public.cashier_terminals
  where is_active = true and pin_hash = crypt(p_pin, pin_hash)
  limit 1;

  return v_terminal_id;
end;
$$;

-- ========== 4) بيع الكاشير (نقطة بيع فعلية) ==========
create or replace function public.create_cashier_sale(
  p_terminal_id uuid,
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
  if not exists (select 1 from public.cashier_terminals where id = p_terminal_id and is_active = true) then
    raise exception 'جهاز الكاشير غير معروف أو غير مفعّل';
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
    discount_percentage, branch_id, notes, sale_channel
  ) values (
    v_invoice_id, v_invoice_number, p_customer_id, v_now,
    v_subtotal, v_vat_amount, v_total_amount, v_qr, p_payment_method,
    case when p_payment_method = 'credit' then 'unpaid'::public.invoice_status else 'paid'::public.invoice_status end,
    0, null, null, 'cashier'
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

-- ========== 5) طلب المتجر الإلكتروني ==========
-- مسار عام (anon عبر service_role) — يعيد التحقق من كل الأسعار والمخزون من
-- القاعدة نفسها، لا يثق بأي سعر قادم من الفرونت إند إطلاقًا.
create or replace function public.create_online_store_order(
  p_customer_id uuid,
  p_items jsonb -- [{product_id, quantity}, ...] بالوحدة الأساسية للمنتج
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
  v_visible boolean;
  v_points integer;
  v_new_balance integer;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'السلة فارغة';
  end if;

  select * into v_settings from public.system_settings where id = 1;

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

    select visible_in_store into v_visible from public.products where id = v_product_id;
    if v_visible is null or v_visible = false then
      raise exception 'منتج غير متاح للطلب';
    end if;

    if v_available is null or v_available < v_quantity then
      raise exception 'الكمية غير متوفرة لمنتج %', v_product_id;
    end if;
  end loop;

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

  -- الدفع نقدًا عند الاستلام (لا بوابة دفع إلكتروني بعد) — الفاتورة تبقى
  -- "غير مسددة" حتى تسجيل التحصيل الفعلي عبر record_customer_payment.
  insert into public.invoices (
    id, invoice_number, customer_id, invoice_date,
    subtotal, vat_amount, total_amount, qr_code_data, payment_method, status,
    discount_percentage, branch_id, notes, sale_channel
  ) values (
    v_invoice_id, v_invoice_number, p_customer_id, v_now,
    v_subtotal, v_vat_amount, v_total_amount, v_qr, 'cash', 'unpaid',
    0, null, null, 'online_store'
  );

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

  v_points := floor(v_total_amount / v_settings.loyalty_riyals_per_point);
  if v_points > 0 then
    update public.customers
    set loyalty_points = loyalty_points + v_points
    where id = p_customer_id
    returning loyalty_points into v_new_balance;

    insert into public.loyalty_point_movements (customer_id, points_change, balance_after, reason)
    values (p_customer_id, v_points, v_new_balance, 'طلب متجر إلكتروني رقم ' || v_invoice_number);
  end if;

  return v_invoice_id;
end;
$$;
