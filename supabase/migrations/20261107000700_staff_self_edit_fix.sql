-- Fix (found in the merchant portal review, 2026-11-07): merchant_update_staff let a manager edit their own row,
-- including branch_ids, so a branch manager could make themselves business-wide. Now your own row's role, branches
-- and active flag are fixed; only the name is yours to change. Safe to run twice.

-- Changes a staff member's name, role, branches or whether they're active. Same rules as adding; nobody changes
-- their own role or deactivates themselves, and the owner row's role never changes here.
create or replace function merchant_update_staff(
  p_staff_id uuid, p_display_name text, p_role staff_role, p_branch_ids uuid[], p_active boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_s merchant_staff%rowtype;
  v_caller staff_role;
begin
  select * into v_s from merchant_staff where id = p_staff_id for update;
  if not found then perform raise_code('forbidden'); end if;
  v_caller := require_merchant_manager(v_s.merchant_id);
  if v_caller = 'manager' and v_s.role <> 'cashier' and v_s.user_id is distinct from auth.uid() then
    perform raise_code('forbidden');
  end if;
  if (v_s.role = 'owner') <> (p_role = 'owner') then perform raise_code('forbidden'); end if;
  if v_caller = 'manager' and p_role not in ('cashier') and v_s.user_id is distinct from auth.uid() then
    perform raise_code('forbidden');
  end if;
  -- Your own row: only the name. Otherwise a branch manager could widen their branches or role themselves.
  if v_s.user_id = auth.uid() and (p_role <> v_s.role or not p_active
      or nullif(p_branch_ids, '{}') is distinct from v_s.branch_ids) then
    perform raise_code('cannot_change_self');
  end if;
  if p_role = 'manager' and v_s.user_id is null then perform raise_code('login_required'); end if;
  if nullif(trim(coalesce(p_display_name, '')), '') is null or length(trim(p_display_name)) > 80 then
    perform raise_code('name_invalid');
  end if;
  if p_branch_ids is not null and exists (
    select 1 from unnest(p_branch_ids) b where not exists (
      select 1 from merchant_branches mb where mb.id = b and mb.merchant_id = v_s.merchant_id)) then
    perform raise_code('branch_invalid');
  end if;
  update merchant_staff
     set display_name = trim(p_display_name), role = p_role, branch_ids = nullif(p_branch_ids, '{}'), active = p_active
   where id = p_staff_id;
  perform log_audit('staff.updated', v_s.merchant_id, 'merchant_staff', p_staff_id::text,
    jsonb_build_object('name', v_s.display_name, 'role', v_s.role, 'active', v_s.active, 'branch_ids', v_s.branch_ids),
    jsonb_build_object('name', trim(p_display_name), 'role', p_role, 'active', p_active, 'branch_ids', p_branch_ids));
end $$;
