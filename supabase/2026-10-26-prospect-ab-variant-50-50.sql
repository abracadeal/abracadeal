-- 26/10/2026 (Claude) : réactivation du test A/B des mails de prospection.
-- prospect_ab_variant renvoyait toujours 'A' : aucun mail B n'était parti (vérifié : 356 envois, tous en A).
-- Répartition 50/50 stable par prospect (même prospect = même variante, y compris pour la relance).
create or replace function public.prospect_ab_variant(p_id uuid)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when (('x' || substr(md5(p_id::text), 1, 8))::bit(32)::int & 1) = 1 then 'B' else 'A' end;
$function$;
