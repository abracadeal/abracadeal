-- 31/10/2026 (Anthony) : bouton « Supprimer » dans « Sites en réparation » : demande annulée + prospect retiré (exclu_admin, jamais de mail).
CREATE OR REPLACE FUNCTION public.admin_robot_learning_delete(p_request_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare r record; v_key text; v_n int;
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  select * into r from public.robot_learning_requests where id=p_request_id;
  if not found then raise exception 'Demande introuvable'; end if;
  v_key := regexp_replace(regexp_replace(regexp_replace(lower(r.url),'^https?://',''),'^www\.',''),'[/?#].*$','');
  update public.robot_learning_requests set status='cancelled', done_at=now(),
    result=trim(coalesce(result,'')||' | '||to_char(now() at time zone 'Europe/Paris','DD/MM/YYYY')||' : supprimé par Anthony')
   where status in ('pending','in_progress','done')
     and regexp_replace(regexp_replace(regexp_replace(lower(url),'^https?://',''),'^www\.',''),'[/?#].*$','')=v_key;
  update public.prospection_prospects set status = case when status in ('ready','sending') then 'paused' else status end,
    segment='exclu_admin', notes=trim(coalesce(notes,'')||' [retiré par l''admin le '||to_char(now() at time zone 'Europe/Paris','DD/MM/YYYY')||' depuis Sites en réparation]'), updated_at=now()
   where (id=r.prospect_id or regexp_replace(regexp_replace(regexp_replace(lower(coalesce(source_url,'')),'^https?://',''),'^www\.',''),'[/?#].*$','')=v_key)
     and status in ('ready','sending','paused');
  get diagnostics v_n = row_count;
  return json_build_object('ok',true,'prospects',v_n);
end $function$;
revoke all on function public.admin_robot_learning_delete(uuid) from public, anon;
grant execute on function public.admin_robot_learning_delete(uuid) to authenticated;
