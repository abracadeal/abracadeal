-- 31/10/2026 (Claude, demande d'Anthony) : « Mail normal » cliqué par Anthony => le site sort de « Sites à apprendre ».
-- admin_mark_prospect_generic écrit site_check_reason 'Choix Anthony : …' ; admin_unreadable_sites ignore ces lignes.
-- (Appliqué en base via execute_sql ; définitions complètes : voir pg_get_functiondef.)
CREATE OR REPLACE FUNCTION public.admin_mark_prospect_generic(p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  update public.prospection_prospects set site_check_status='generic',
    site_check_reason='Choix Anthony : mail normal (publier soi-même ou envoyer le flux du logiciel)', updated_at=now()
  where id=p_id;
end $function$;
CREATE OR REPLACE FUNCTION public.admin_unreadable_sites(p_limit integer DEFAULT 100)
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  return json_build_object(
   'prospects',(select coalesce(json_agg(x order by x.checked desc),'[]'::json) from (select id, company, category, city, source_url url, site_check_platform platform, site_check_reason reason, site_checked_at checked from public.prospection_prospects where (site_check_status='unreadable' or (site_check_status='generic' and status='ready' and coalesce(site_check_reason,'') not like 'Choix Anthony%')) and coalesce(segment,'') not like 'exclu%' order by site_checked_at desc limit least(greatest(coalesce(p_limit,100),1),500)) x),
   'counts',(select json_build_object('ok',count(*) filter (where site_check_status='ok'),'manual',count(*) filter (where site_check_status='manual' and coalesce(segment,'') not like 'exclu%'),'generic',count(*) filter (where site_check_status='generic' and coalesce(segment,'') not like 'exclu%'),'unreadable',count(*) filter (where (site_check_status='unreadable' or (site_check_status='generic' and coalesce(site_check_reason,'') not like 'Choix Anthony%')) and status='ready' and coalesce(segment,'') not like 'exclu%'),'to_check',count(*) filter (where site_check_status is null and status='ready' and source_url ~* '^https?://' and coalesce(segment,'') not like 'exclu%')) from public.prospection_prospects));
end $function$;
