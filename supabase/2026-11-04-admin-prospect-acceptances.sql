-- 04/11/2026 — Claude — Accords « Je publie » visibles dans l'admin Prospection (demande d'Anthony : « il faut que ça soit dans mon côté admin »).
-- Lecture des accords + bouton « Marquer comme traité ». Réservé à l'administrateur. Rien n'est importé ni publié par ces fonctions.
create or replace function public.admin_prospect_acceptances()
returns json language plpgsql security definer set search_path = '' as $$
declare v json;
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  select coalesce(json_agg(r order by r.handled_at is not null, r.accepted_at desc), '[]'::json) into v from (
    select a.id, a.prospect_id, a.siret, a.email, a.phone, a.siren_matches, a.accepted_at, a.handled_at, a.handled_note,
           p.company, p.category, p.city, p.source_url, p.siren as known_siren, p.email as prospect_email, p.ref_code
      from private.prospect_acceptances a
      join public.prospection_prospects p on p.id = a.prospect_id
     where a.handled_at is null or a.handled_at > now() - interval '30 days'
  ) r;
  return v;
end $$;
revoke all on function public.admin_prospect_acceptances() from public, anon;
grant execute on function public.admin_prospect_acceptances() to authenticated;

create or replace function public.admin_prospect_acceptance_handle(p_id bigint, p_handled boolean default true, p_note text default null)
returns json language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  update private.prospect_acceptances
     set handled_at = case when p_handled then now() else null end,
         handled_note = case when p_handled then nullif(left(btrim(coalesce(p_note,'')),500),'') else null end
   where id = p_id;
  if not found then return json_build_object('ok',false,'error','Accord introuvable'); end if;
  return json_build_object('ok',true);
end $$;
revoke all on function public.admin_prospect_acceptance_handle(bigint,boolean,text) from public, anon;
grant execute on function public.admin_prospect_acceptance_handle(bigint,boolean,text) to authenticated;
