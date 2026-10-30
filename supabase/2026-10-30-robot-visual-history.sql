-- One site can have several successive repair requests. Validate all completed
-- requests for that exact site together, while preserving each historical row.
create or replace function public.admin_confirm_robot_learning_visual(p_url text,p_request_id uuid default null)
returns json language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  if coalesce(p_url,'') !~* '^https?://' then raise exception 'Adresse de site invalide'; end if;
  if p_request_id is not null and not exists (
    select 1 from public.robot_learning_requests
    where id=p_request_id and lower(rtrim(url,'/'))=lower(rtrim(p_url,'/')) and status='done'
  ) then raise exception 'La demande ne correspond pas au site réparé'; end if;
  update public.robot_learning_requests set visual_validated_at=now()
  where status='done' and visual_validated_at is null
    and lower(rtrim(url,'/'))=lower(rtrim(p_url,'/'));
  get diagnostics n=row_count;
  return json_build_object('ok',true,'archived',n);
end $$;
revoke all on function public.admin_confirm_robot_learning_visual(text,uuid) from public,anon;
grant execute on function public.admin_confirm_robot_learning_visual(text,uuid) to authenticated;
