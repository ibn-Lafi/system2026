-- ========== حذف "فترة سماح تعديل/إلغاء الفاتورة" كإعداد + المسار التالي لها ==========
-- بطلب المستخدم صراحة: الإلغاء يصير فوريًا دائمًا بلا أي فترة سماح مُعدّة
-- بالإعدادات ولا مسار موافقة منفصل بعدها.
--
-- 1) cancel_invoice_within_grace_period → إعادة تسمية cancel_invoice + حذف
--    التحقق الزمني من الفترة (الإلغاء يصير فوريًا دائمًا، بنفس منطق إعادة
--    المخزون + إشعار الدائن + منع الازدواج مع مرتجع سابق كما هو).
--
-- 2) مسار "طلب موافقة الأدمن بعد انتهاء فترة السماح" حُذف بالكامل: تحقّقنا
--    (بفحص كامل الكود) أن request_invoice_edit (المسار الوحيد لإنشاء صف
--    invoice_edit_requests) حُذفت أصلًا بـmigration
--    20260828000000_remove_rep_schema.sql (كانت حصرية لتطبيق المندوب
--    المحذوف بالكامل) ولم تُستبدل بأي مسار آخر — فصار جدول
--    invoice_edit_requests ودالة المراجعة review_invoice_edit_request
--    وصفحة /invoice-requests بالأدمن وصلاحية manage_invoice_requests بلا أي
--    مسار وصول حي (لا شيء ينشئ صفوفًا جديدة بالجدول، ولا معنى لمفهوم "بعد
--    انتهاء فترة السماح" أصلًا بما أن الإلغاء صار فوريًا دائمًا). حذفها هنا
--    يزيل كودًا ميتًا بالكامل ولا يكسر أي مسار عمل حالي.

drop function if exists public.cancel_invoice_within_grace_period(uuid, text);

create function public.cancel_invoice(
  p_invoice_id uuid,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
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
    raise exception 'لا يمكن إلغاء فاتورة سبق تسجيل مرتجع عليها';
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

drop function if exists public.review_invoice_edit_request(uuid, public.edit_request_status, text);
drop table if exists public.invoice_edit_requests;
drop type if exists public.edit_request_status;

alter table public.system_settings drop column if exists invoice_edit_grace_period_minutes;

-- إزالة صلاحية manage_invoice_requests من دالة الصلاحيات (لم يعد لها أي
-- استخدام بعد حذف مسار الموافقة أعلاه) — إعادة تعريف كاملة مطابقة لآخر
-- نسخة (20260829020000_hr_module.sql) بدون حالة manage_invoice_requests بدور supervisor.
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
    when 'supervisor' then p_permission in ('view_reports', 'manage_returns')
    else false
  end;
$$;
