-- Manual visual validation is distinct from the technical reader repair.
alter table public.robot_learning_requests add column if not exists visual_validated_at timestamptz;

create or replace function public.admin_list_robot_learning(p_limit integer default 30)
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  return (select coalesce(json_agg(x order by x.requested_at desc),'[]'::json) from (
    select id,url,sector,company,prospect_id,note,status,result,handled_by,requested_at,done_at,visual_validated_at
    from public.robot_learning_requests where visual_validated_at is null
    order by (status in ('pending','in_progress')) desc,requested_at desc
    limit least(greatest(coalesce(p_limit,30),1),200)
  ) x);
end $$;

create or replace function public.admin_confirm_robot_learning_visual(p_url text,p_request_id uuid default null)
returns json language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  if coalesce(p_url,'') !~* '^https?://' then raise exception 'Adresse de site invalide'; end if;
  update public.robot_learning_requests
  set visual_validated_at=now()
  where status='done' and visual_validated_at is null
    and lower(rtrim(url,'/'))=lower(rtrim(p_url,'/'))
    and (p_request_id is null or id=p_request_id);
  get diagnostics n=row_count;
  return json_build_object('ok',true,'archived',n);
end $$;
revoke all on function public.admin_confirm_robot_learning_visual(text,uuid) from public,anon;
grant execute on function public.admin_confirm_robot_learning_visual(text,uuid) to authenticated;
