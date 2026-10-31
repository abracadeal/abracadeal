-- 31/10/2026 (Anthony) : bouton « Mail normal » dans « Sites en réparation » (site protégé / impossible à lire).
-- Ferme la demande (cancelled) et passe le prospect en mail normal (site_check_reason 'Choix Anthony : …'). Appliqué via execute_sql.
-- Définition complète : pg_get_functiondef('public.admin_robot_learning_mail_normal'::regproc).
CREATE OR REPLACE FUNCTION public.admin_robot_learning_mail_normal(p_request_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare r record; v_key text; v_n int;
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  select * into r from public.robot_learning_requests where id=p_request_id;
  if not found then raise exception 'Demande introuvable'; end if;
  v_key := regexp_replace(regexp_replace(regexp_replace(lower(r.url),'^https?://',''),'^www\.',''),'[/?#].*$','');
  update public.robot_learning_requests set status='cancelled', done_at=now(),
    result=trim(coalesce(result,'')||' | '||to_char(now() at time zone 'Europe/Paris','DD/MM/YYYY')||' : arrêté par Anthony → mail normal')
   where status in ('pending','in_progress','done')
     and regexp_replace(regexp_replace(regexp_replace(lower(url),'^https?://',''),'^www\.',''),'[/?#].*$','')=v_key;
  update public.prospection_prospects set site_check_status='generic',
    site_check_reason='Choix Anthony : mail normal (publier soi-même ou envoyer le flux du logiciel)', updated_at=now()
   where (id=r.prospect_id or regexp_replace(regexp_replace(regexp_replace(lower(coalesce(source_url,'')),'^https?://',''),'^www\.',''),'[/?#].*$','')=v_key)
     and status in ('ready','paused');
  get diagnostics v_n = row_count;
  return json_build_object('ok',true,'prospects',v_n);
end $function$;
revoke all on function public.admin_robot_learning_mail_normal(uuid) from public, anon;
grant execute on function public.admin_robot_learning_mail_normal(uuid) to authenticated;
