-- 31/10/2026 — Claude : « Valider ce site » (admin-test-import.html) refusait avec « La demande ne correspond pas au site réparé »
-- quand le site était encore EN ATTENTE dans « Sites en réparation » (ex. Slycar relancé en réparation puis validé à la main).
-- Fusion des deux versions : contrôle de ChatGPT conservé (la demande indiquée doit être celle de ce site),
-- + règle d'Anthony du 30/10 : un site validé à la main ferme ses demandes en attente / en cours, puis tout est archivé (visual_validated_at).
-- Comparaison d'adresse sans http(s):// ni www. ni / final.
-- NE PAS retirer la fermeture des demandes pending / in_progress lors d'une prochaine modification.
CREATE OR REPLACE FUNCTION public.admin_confirm_robot_learning_visual(p_url text, p_request_id uuid DEFAULT NULL::uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare n integer; m integer;
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  if coalesce(p_url,'') !~* '^https?://' then raise exception 'Adresse de site invalide'; end if;
  if p_request_id is not null and not exists (
    select 1 from public.robot_learning_requests
    where id=p_request_id
      and regexp_replace(lower(rtrim(url,'/')),'^https?://(www\.)?','')=regexp_replace(lower(rtrim(p_url,'/')),'^https?://(www\.)?','')
      and status in ('done','pending','in_progress')
  ) then raise exception 'La demande ne correspond pas au site réparé'; end if;
  update public.robot_learning_requests
  set status='done', done_at=now(), handled_by=coalesce(handled_by,'Anthony'), result=coalesce(result,'Validé à la main après test du site')
  where status in ('pending','in_progress')
    and regexp_replace(lower(rtrim(url,'/')),'^https?://(www\.)?','')=regexp_replace(lower(rtrim(p_url,'/')),'^https?://(www\.)?','');
  get diagnostics m=row_count;
  update public.robot_learning_requests set visual_validated_at=now()
  where status='done' and visual_validated_at is null
    and regexp_replace(lower(rtrim(url,'/')),'^https?://(www\.)?','')=regexp_replace(lower(rtrim(p_url,'/')),'^https?://(www\.)?','');
  get diagnostics n=row_count;
  return json_build_object('ok',true,'archived',n,'closed',m);
end $function$;
