-- 31/10/2026 (Anthony) : prospect qui a dit STOP / s'est désinscrit → pas d'offre Fondateurs s'il s'inscrit plus tard (tarif public).
-- private.founder_optout_conflict(p_user) : même e-mail, même SIREN, ou même domaine pro (hors webmails, hors réseaux >= 3 adresses).
-- Branché dans private.founder_identity_conflict → claim_founder_slot / get_my_founder_availability renvoient founder_already_used ;
-- create-pro-subscription-order facture alors le tarif public. Définitions : voir pg_get_functiondef (appliqué via execute_sql).
CREATE OR REPLACE FUNCTION private.founder_optout_conflict(p_user uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  with me as (
    select lower(u.email) email, split_part(lower(u.email),'@',2) dom, nullif(left(regexp_replace(coalesce(pv.siren,pv.siret,''),'\D','','g'),9),'') siren
    from auth.users u left join public.pro_verifications pv on pv.user_id=u.id where u.id=p_user),
  stop as (
    select lower(p.email) email, split_part(lower(p.email),'@',2) dom, nullif(left(regexp_replace(coalesce(p.siren,''),'\D','','g'),9),'') siren
    from public.prospection_prospects p where p.opted_out_at is not null or p.status='opted_out')
  select exists (
    select 1 from me join stop s on
      s.email=me.email
      or (me.siren is not null and s.siren=me.siren)
      or (s.dom=me.dom and me.dom !~ '^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|aol|gmx|orange|wanadoo|free|sfr|neuf|laposte|bbox|numericable|club-internet|proton|protonmail)\.'
          and (select count(*) from public.prospection_prospects q where split_part(lower(q.email),'@',2)=me.dom) < 3))
$function$;
CREATE OR REPLACE FUNCTION private.founder_identity_conflict(p_user uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select exists (
    select 1 from private.founder_identities(p_user) i
    join private.founder_identity_registry r on r.kind = i.kind and r.value_hash = i.value_hash
    where r.user_id <> p_user)
  or private.founder_optout_conflict(p_user)
$function$;
