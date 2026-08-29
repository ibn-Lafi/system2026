-- نقاط ولاء العملاء (رصيد + سجل حركات) + شكاوى العملاء + قناة بيع الفاتورة.
-- المرحلة الحالية: إضافة نقاط يدوية فقط من الأدمن/الموظف المخوَّل (راجع
-- CLAUDE.md §4.3 — أي تغيير رصيد يمر حصرًا عبر RPC يكتب سجل حركة بنفس
-- المعاملة). احتساب النقاط تلقائيًا من نظام كاشير/طلبات المتجر الإلكتروني
-- ومنتجات استرداد النقاط = مرحلة لاحقة تُصمَّم بشكل منفصل.

-- ========== قناة بيع الفاتورة (كاشير مقابل المتجر الإلكتروني) ==========
create type public.invoice_sale_channel as enum ('cashier', 'online_store');

alter table public.invoices
  add column sale_channel public.invoice_sale_channel not null default 'cashier';

-- ========== نقاط ولاء العميل ==========
alter table public.customers
  add column loyalty_points integer not null default 0;

-- ========== سجل حركات نقاط الولاء (Append-only — نفس مبدأ stock_movements) ==========
create table public.loyalty_point_movements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  points_change integer not null,
  balance_after integer not null,
  reason text not null,
  performed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index loyalty_point_movements_customer_id_idx on public.loyalty_point_movements (customer_id);

alter table public.loyalty_point_movements enable row level security;

-- لا Policy لـ INSERT هنا عمدًا — الكتابة حصرًا عبر add_loyalty_points() أدناه.
create policy "loyalty_point_movements_select_staff"
on public.loyalty_point_movements for select
using (public.auth_is_staff());

create or replace function public.add_loyalty_points(
  p_customer_id uuid,
  p_points integer,
  p_reason text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  if not public.auth_has_permission('manage_customers') then
    raise exception 'ليست لديك صلاحية تعديل نقاط الولاء';
  end if;

  if p_points is null or p_points <= 0 then
    raise exception 'عدد النقاط المضافة يجب أن يكون أكبر من صفر';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'سبب إضافة النقاط إلزامي';
  end if;

  update public.customers
  set loyalty_points = loyalty_points + p_points
  where id = p_customer_id
  returning loyalty_points into v_new_balance;

  if v_new_balance is null then
    raise exception 'العميل غير موجود';
  end if;

  insert into public.loyalty_point_movements (customer_id, points_change, balance_after, reason, performed_by)
  values (p_customer_id, p_points, v_new_balance, p_reason, auth.uid());

  return v_new_balance;
end;
$$;

-- ========== شكاوى العملاء ==========
create type public.customer_complaint_status as enum ('open', 'in_progress', 'resolved');

create table public.customer_complaints (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  branch_id uuid references public.customer_branches (id) on delete set null,
  description text not null,
  status public.customer_complaint_status not null default 'open',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_complaints_customer_id_idx on public.customer_complaints (customer_id);

create trigger set_updated_at before update on public.customer_complaints
  for each row execute function public.set_updated_at();

alter table public.customer_complaints enable row level security;

create policy "customer_complaints_select_staff"
on public.customer_complaints for select
using (public.auth_is_staff());

create policy "customer_complaints_insert_manage_customers"
on public.customer_complaints for insert
with check (public.auth_has_permission('manage_customers'));

create policy "customer_complaints_update_manage_customers"
on public.customer_complaints for update
using (public.auth_has_permission('manage_customers'))
with check (public.auth_has_permission('manage_customers'));
