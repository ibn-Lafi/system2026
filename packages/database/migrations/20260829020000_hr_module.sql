-- وحدة الموارد البشرية: الموظفون، الحضور، الإجازات وأرصدتها، الورديات
-- (تسجيل يدوي بدل تكامل فعلي مع جهاز بصمة — لا يوجد وصول لعتاد خارجي من
-- تطبيق ويب)، مسير الرواتب وصرف الأجور، السلف والعهد، مكافأة نهاية الخدمة،
-- والتقييم الوظيفي. راجع CLAUDE.md §4.3 — أي عملية تمس أكثر من جدول مترابط
-- تمر عبر RPC (SECURITY DEFINER) بمعاملة واحدة.
--
-- ملاحظة هامة: صيغة احتساب مكافأة نهاية الخدمة بدالة calculate_end_of_service
-- أدناه مبسّطة (المادة 84 من نظام العمل السعودي بصورتها العامة: نصف شهر عن كل
-- سنة من أول 5 سنوات، وشهر كامل عن كل سنة بعدها) ولا تفرّق بين حالات
-- الاستقالة/الفصل التي قد تُخفّض الاستحقاق قانونًا — يجب مراجعتها من
-- محاسب/مختص قانوني قبل اعتمادها فعليًا لأي موظف حقيقي.

-- ========== صلاحية جديدة: manage_hr (مُتاحة أيضًا لدور accountant) ==========
create or replace function public.auth_has_permission(p_permission text)
returns boolean
language sql
stable
as $$
  select case public.auth_role()
    when 'admin' then true
    when 'accountant' then p_permission in ('view_reports', 'manage_collections', 'manage_hr')
    when 'marketing' then p_permission in ('manage_products', 'view_reports')
    when 'sales' then p_permission in ('manage_customers', 'manage_collections', 'manage_returns', 'view_reports')
    when 'production' then p_permission in ('manage_products', 'manage_purchases', 'manage_warehouse', 'view_reports')
    when 'supervisor' then p_permission in ('view_reports', 'manage_invoice_requests', 'manage_returns')
    else false
  end;
$$;

-- ========== أنواع تعداد ==========
create type public.hr_leave_type as enum ('annual', 'sick', 'unpaid', 'other');
create type public.hr_leave_status as enum ('pending', 'approved', 'rejected');
create type public.hr_attendance_status as enum ('present', 'absent', 'late', 'on_leave');
create type public.hr_advance_status as enum ('pending', 'approved', 'repaid');
create type public.hr_custody_status as enum ('assigned', 'returned');
create type public.hr_payroll_run_status as enum ('draft', 'paid');

-- ========== shifts (الورديات) ==========
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== employees (الموظفون) ==========
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  national_id text,
  phone text,
  email text,
  job_title text,
  department text,
  hire_date date not null,
  termination_date date,
  shift_id uuid references public.shifts (id) on delete set null,
  basic_salary numeric(14, 2) not null default 0 check (basic_salary >= 0),
  housing_allowance numeric(14, 2) not null default 0 check (housing_allowance >= 0),
  other_allowances numeric(14, 2) not null default 0 check (other_allowances >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index employees_profile_id_idx on public.employees (profile_id);

-- ========== attendance_records (الحضور) ==========
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status public.hr_attendance_status not null default 'present',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index attendance_records_employee_id_idx on public.attendance_records (employee_id);

-- ========== employee_leave_balances (أرصدة الإجازات) ==========
create table public.employee_leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type public.hr_leave_type not null,
  year integer not null,
  entitled_days numeric(6, 2) not null default 0 check (entitled_days >= 0),
  used_days numeric(6, 2) not null default 0 check (used_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, leave_type, year)
);

-- ========== leave_requests (الإجازات) ==========
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type public.hr_leave_type not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  days_count numeric(6, 2) not null check (days_count > 0),
  reason text,
  status public.hr_leave_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leave_requests_employee_id_idx on public.leave_requests (employee_id);

-- ========== الموافقة على إجازة: تحديث الحالة وخصم الرصيد بنفس المعاملة ==========
create or replace function public.approve_leave_request(p_leave_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_leave record;
begin
  if not public.auth_has_permission('manage_hr') then
    raise exception 'ليست لديك صلاحية اعتماد الإجازات';
  end if;

  select * into v_leave from public.leave_requests where id = p_leave_request_id for update;
  if v_leave is null then
    raise exception 'طلب الإجازة غير موجود';
  end if;
  if v_leave.status <> 'pending' then
    raise exception 'تمت مراجعة هذا الطلب مسبقًا';
  end if;

  update public.leave_requests
  set status = 'approved', reviewed_by = auth.uid()
  where id = p_leave_request_id;

  insert into public.employee_leave_balances (employee_id, leave_type, year, entitled_days, used_days)
  values (v_leave.employee_id, v_leave.leave_type, extract(year from v_leave.start_date)::int, 0, v_leave.days_count)
  on conflict (employee_id, leave_type, year)
  do update set used_days = public.employee_leave_balances.used_days + v_leave.days_count;
end;
$$;

create or replace function public.reject_leave_request(p_leave_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_has_permission('manage_hr') then
    raise exception 'ليست لديك صلاحية مراجعة الإجازات';
  end if;

  update public.leave_requests
  set status = 'rejected', reviewed_by = auth.uid()
  where id = p_leave_request_id and status = 'pending';
end;
$$;

-- ========== employee_advances (السلف) ==========
create table public.employee_advances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  reason text,
  request_date date not null default current_date,
  monthly_deduction_amount numeric(14, 2) not null default 0 check (monthly_deduction_amount >= 0),
  remaining_balance numeric(14, 2) not null check (remaining_balance >= 0),
  status public.hr_advance_status not null default 'pending',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index employee_advances_employee_id_idx on public.employee_advances (employee_id);

-- ========== employee_custody_items (العهد) ==========
create table public.employee_custody_items (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  item_name text not null,
  description text,
  assigned_date date not null default current_date,
  returned_date date,
  status public.hr_custody_status not null default 'assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index employee_custody_items_employee_id_idx on public.employee_custody_items (employee_id);

-- ========== payroll_runs (مسير الرواتب) ==========
create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period_month integer not null check (period_month between 1 and 12),
  period_year integer not null,
  status public.hr_payroll_run_status not null default 'draft',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_month, period_year)
);

-- ========== payroll_items (بند راتب كل موظف بمسير محدد) ==========
create table public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete restrict,
  basic_salary numeric(14, 2) not null,
  allowances numeric(14, 2) not null default 0,
  deductions numeric(14, 2) not null default 0 check (deductions >= 0),
  net_salary numeric(14, 2) not null,
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_run_id, employee_id)
);
create index payroll_items_employee_id_idx on public.payroll_items (employee_id);

-- ========== إنشاء مسير رواتب: يُنشئ بند لكل موظف نشط (لقطة الراتب الحالية) ==========
create or replace function public.generate_payroll_run(p_period_month integer, p_period_year integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payroll_run_id uuid := gen_random_uuid();
  v_employee record;
begin
  if not public.auth_has_permission('manage_hr') then
    raise exception 'ليست لديك صلاحية إنشاء مسير رواتب';
  end if;

  insert into public.payroll_runs (id, period_month, period_year, created_by)
  values (v_payroll_run_id, p_period_month, p_period_year, auth.uid());

  for v_employee in
    select id, basic_salary, housing_allowance, other_allowances
    from public.employees
    where is_active = true
  loop
    insert into public.payroll_items (
      payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary
    ) values (
      v_payroll_run_id,
      v_employee.id,
      v_employee.basic_salary,
      v_employee.housing_allowance + v_employee.other_allowances,
      0,
      v_employee.basic_salary + v_employee.housing_allowance + v_employee.other_allowances
    );
  end loop;

  return v_payroll_run_id;
end;
$$;

-- ========== تعديل بند راتب (خصومات إضافية) قبل الصرف — يعيد احتساب الصافي ==========
create or replace function public.update_payroll_item_deductions(p_payroll_item_id uuid, p_deductions numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_has_permission('manage_hr') then
    raise exception 'ليست لديك صلاحية تعديل بنود الرواتب';
  end if;
  if p_deductions is null or p_deductions < 0 then
    raise exception 'قيمة الخصم يجب أن تكون صفر أو أكبر';
  end if;

  update public.payroll_items
  set deductions = p_deductions,
      net_salary = basic_salary + allowances - p_deductions
  where id = p_payroll_item_id and is_paid = false;
end;
$$;

-- ========== wage_payments (صرف الأجور) ==========
create table public.wage_payments (
  id uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null references public.payroll_items (id) on delete restrict,
  payment_date date not null default current_date,
  method public.settlement_method not null default 'transfer',
  amount numeric(14, 2) not null check (amount > 0),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ========== صرف راتب بند محدد: تسجيل الدفعة + تعليم البند مدفوعًا، وإقفال
-- المسير تلقائيًا إذا صُرفت كل بنوده ==========
create or replace function public.pay_payroll_item(
  p_payroll_item_id uuid,
  p_method public.settlement_method
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_remaining_unpaid integer;
begin
  if not public.auth_has_permission('manage_hr') then
    raise exception 'ليست لديك صلاحية صرف الرواتب';
  end if;

  select * into v_item from public.payroll_items where id = p_payroll_item_id for update;
  if v_item is null then
    raise exception 'بند الراتب غير موجود';
  end if;
  if v_item.is_paid then
    raise exception 'تم صرف هذا البند مسبقًا';
  end if;

  insert into public.wage_payments (payroll_item_id, method, amount, created_by)
  values (p_payroll_item_id, p_method, v_item.net_salary, auth.uid());

  update public.payroll_items set is_paid = true where id = p_payroll_item_id;

  select count(*) into v_remaining_unpaid
  from public.payroll_items
  where payroll_run_id = v_item.payroll_run_id and is_paid = false;

  if v_remaining_unpaid = 0 then
    update public.payroll_runs set status = 'paid' where id = v_item.payroll_run_id;
  end if;
end;
$$;

-- ========== end_of_service_settlements (مكافأة نهاية الخدمة) ==========
create table public.end_of_service_settlements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  termination_date date not null,
  years_of_service numeric(6, 2) not null,
  gratuity_amount numeric(14, 2) not null,
  calculation_notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ========== احتساب مكافأة نهاية الخدمة (صيغة مبسّطة — راجع الملاحظة أعلى الملف) ==========
create or replace function public.calculate_end_of_service(p_employee_id uuid, p_termination_date date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee record;
  v_years numeric;
  v_gratuity numeric;
  v_settlement_id uuid;
begin
  if not public.auth_has_permission('manage_hr') then
    raise exception 'ليست لديك صلاحية احتساب مكافأة نهاية الخدمة';
  end if;

  select * into v_employee from public.employees where id = p_employee_id;
  if v_employee is null then
    raise exception 'الموظف غير موجود';
  end if;
  if p_termination_date < v_employee.hire_date then
    raise exception 'تاريخ انتهاء الخدمة يجب أن يكون بعد تاريخ التعيين';
  end if;

  v_years := extract(epoch from age(p_termination_date, v_employee.hire_date)) / (365.25 * 24 * 3600);

  v_gratuity := case
    when v_years <= 5 then v_years * (v_employee.basic_salary / 2)
    else 5 * (v_employee.basic_salary / 2) + (v_years - 5) * v_employee.basic_salary
  end;

  insert into public.end_of_service_settlements (
    employee_id, termination_date, years_of_service, gratuity_amount, calculation_notes, created_by
  ) values (
    p_employee_id, p_termination_date, round(v_years, 2), round(v_gratuity, 2),
    'صيغة مبسّطة تقديرية — راجع محاسب/مختص قانوني قبل الاعتماد النهائي', auth.uid()
  )
  returning id into v_settlement_id;

  update public.employees
  set is_active = false, termination_date = p_termination_date
  where id = p_employee_id;

  return v_settlement_id;
end;
$$;

-- ========== performance_appraisals (التقييم الوظيفي) ==========
create table public.performance_appraisals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  appraisal_period text not null,
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  strengths text,
  areas_for_improvement text,
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index performance_appraisals_employee_id_idx on public.performance_appraisals (employee_id);

-- ========== updated_at التلقائي ==========
create trigger set_updated_at before update on public.shifts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.employees
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.attendance_records
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.employee_leave_balances
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.leave_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.employee_advances
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.employee_custody_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.payroll_runs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.payroll_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.performance_appraisals
  for each row execute function public.set_updated_at();

-- ========== RLS ==========
alter table public.shifts enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_records enable row level security;
alter table public.employee_leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.employee_advances enable row level security;
alter table public.employee_custody_items enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_items enable row level security;
alter table public.wage_payments enable row level security;
alter table public.end_of_service_settlements enable row level security;
alter table public.performance_appraisals enable row level security;

-- shifts: عرض عام لموظفي الإدارة، والتعديل لصاحب صلاحية manage_hr فقط.
create policy "shifts_select_staff" on public.shifts for select using (public.auth_is_staff());
create policy "shifts_manage" on public.shifts for all
  using (public.auth_has_permission('manage_hr')) with check (public.auth_has_permission('manage_hr'));

-- employees: يراها موظفو الإدارة كافة (manage_hr) + الموظف نفسه (بياناتي).
create policy "employees_select_hr_or_self" on public.employees for select
  using (public.auth_has_permission('manage_hr') or profile_id = auth.uid());
create policy "employees_manage" on public.employees for insert
  with check (public.auth_has_permission('manage_hr'));
create policy "employees_update" on public.employees for update
  using (public.auth_has_permission('manage_hr')) with check (public.auth_has_permission('manage_hr'));

-- الجداول المرتبطة بموظف: نفس نمط (manage_hr أو صاحب السجل عبر employees.profile_id).
create policy "attendance_records_select" on public.attendance_records for select
  using (
    public.auth_has_permission('manage_hr')
    or exists (select 1 from public.employees e where e.id = attendance_records.employee_id and e.profile_id = auth.uid())
  );
create policy "attendance_records_manage" on public.attendance_records for all
  using (public.auth_has_permission('manage_hr')) with check (public.auth_has_permission('manage_hr'));

create policy "employee_leave_balances_select" on public.employee_leave_balances for select
  using (
    public.auth_has_permission('manage_hr')
    or exists (select 1 from public.employees e where e.id = employee_leave_balances.employee_id and e.profile_id = auth.uid())
  );
create policy "employee_leave_balances_manage" on public.employee_leave_balances for all
  using (public.auth_has_permission('manage_hr')) with check (public.auth_has_permission('manage_hr'));

create policy "leave_requests_select" on public.leave_requests for select
  using (
    public.auth_has_permission('manage_hr')
    or exists (select 1 from public.employees e where e.id = leave_requests.employee_id and e.profile_id = auth.uid())
  );
create policy "leave_requests_insert" on public.leave_requests for insert
  with check (
    public.auth_has_permission('manage_hr')
    or exists (select 1 from public.employees e where e.id = leave_requests.employee_id and e.profile_id = auth.uid())
  );
-- لا Policy لـ UPDATE هنا عمدًا — تغيير الحالة حصرًا عبر approve/reject_leave_request().

create policy "employee_advances_select" on public.employee_advances for select
  using (
    public.auth_has_permission('manage_hr')
    or exists (select 1 from public.employees e where e.id = employee_advances.employee_id and e.profile_id = auth.uid())
  );
create policy "employee_advances_manage" on public.employee_advances for all
  using (public.auth_has_permission('manage_hr')) with check (public.auth_has_permission('manage_hr'));

create policy "employee_custody_items_select" on public.employee_custody_items for select
  using (
    public.auth_has_permission('manage_hr')
    or exists (select 1 from public.employees e where e.id = employee_custody_items.employee_id and e.profile_id = auth.uid())
  );
create policy "employee_custody_items_manage" on public.employee_custody_items for all
  using (public.auth_has_permission('manage_hr')) with check (public.auth_has_permission('manage_hr'));

create policy "payroll_runs_select" on public.payroll_runs for select using (public.auth_has_permission('manage_hr'));
-- لا Policy لـ INSERT/UPDATE — حصرًا عبر generate_payroll_run()/pay_payroll_item().

create policy "payroll_items_select" on public.payroll_items for select
  using (
    public.auth_has_permission('manage_hr')
    or exists (select 1 from public.employees e where e.id = payroll_items.employee_id and e.profile_id = auth.uid())
  );
-- لا Policy لـ INSERT/UPDATE — حصرًا عبر generate_payroll_run()/update_payroll_item_deductions()/pay_payroll_item().

create policy "wage_payments_select" on public.wage_payments for select
  using (
    public.auth_has_permission('manage_hr')
    or exists (
      select 1 from public.payroll_items pi
      join public.employees e on e.id = pi.employee_id
      where pi.id = wage_payments.payroll_item_id and e.profile_id = auth.uid()
    )
  );
-- لا Policy لـ INSERT — حصرًا عبر pay_payroll_item().

create policy "end_of_service_settlements_select" on public.end_of_service_settlements for select
  using (
    public.auth_has_permission('manage_hr')
    or exists (select 1 from public.employees e where e.id = end_of_service_settlements.employee_id and e.profile_id = auth.uid())
  );
-- لا Policy لـ INSERT — حصرًا عبر calculate_end_of_service().

create policy "performance_appraisals_select" on public.performance_appraisals for select
  using (
    public.auth_has_permission('manage_hr')
    or exists (select 1 from public.employees e where e.id = performance_appraisals.employee_id and e.profile_id = auth.uid())
  );
create policy "performance_appraisals_manage" on public.performance_appraisals for all
  using (public.auth_has_permission('manage_hr')) with check (public.auth_has_permission('manage_hr'));
