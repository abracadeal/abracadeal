-- 02/11/2026 — Claude — « Je publie » sur l'aperçu prospect (pro-fondateur.html?r=<code>) : le pro donne son accord + son SIRET.
-- Rien n'est publié automatiquement : l'accord est enregistré, la relance s'arrête, Anthony (ou Claude) lance l'import ensuite.
create table if not exists private.prospect_acceptances (
  id bigserial primary key,
  prospect_id uuid not null references public.prospection_prospects(id) on delete cascade,
  siret text not null, email text not null, phone text,
  siren_matches boolean, accepted_at timestamptz not null default now(), handled_at timestamptz, handled_note text
);
create or replace function private.siret_ok(s text) returns boolean language sql immutable set search_path to '' as $$
  select s ~ '^[0-9]{14}$' and (
    s like '356000000%' or
    (select sum(case when (i % 2) = 1 then (case when d*2 > 9 then d*2-9 else d*2 end) else d end) % 10 = 0
       from (select i, substr(s, 14 - i, 1)::int d from generate_series(0, 13) i) x))
$$;
create or replace function public.prospect_accept(p_code text, p_siret text, p_email text, p_phone text default null)
returns json language plpgsql security definer set search_path to '' as $$
declare p record; v_siret text := regexp_replace(coalesce(p_siret,''), '\D', '', 'g'); v_email text := lower(btrim(coalesce(p_email,''))); n int;
begin
  if p_code !~ '^[a-z0-9]{8}$' then return json_build_object('ok',false,'error','Lien invalide'); end if;
  select * into p from public.prospection_prospects where ref_code = p_code and opted_out_at is null limit 1;
  if not found then return json_build_object('ok',false,'error','Lien invalide ou expiré'); end if;
  if not private.siret_ok(v_siret) then return json_build_object('ok',false,'error','Numéro SIRET invalide (14 chiffres)'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then return json_build_object('ok',false,'error','Adresse e-mail invalide'); end if;
  select count(*) into n from private.prospect_acceptances where prospect_id = p.id;
  if n >= 3 then return json_build_object('ok',true,'already',true); end if;
  insert into private.prospect_acceptances(prospect_id, siret, email, phone, siren_matches)
  values (p.id, v_siret, v_email, nullif(left(btrim(coalesce(p_phone,'')),30),''),
          case when p.siren ~ '^[0-9]{9}$' then left(v_siret,9) = p.siren else null end);
  update public.prospection_prospects set last_inbound_contact_at = now(), updated_at = now() where id = p.id;
  insert into public.prospection_logs(prospect_id, action, detail) values (p.id, 'accept', 'Accord « Je publie » donné sur l’aperçu (SIRET fourni)');
  return json_build_object('ok',true);
end $$;
revoke all on function public.prospect_accept(text,text,text,text) from public;
grant execute on function public.prospect_accept(text,text,text,text) to anon, authenticated;
-- Aussi appliqués le 02/11/2026 : migration « prospect_claim_shared_quota_preview_first » (retour au quota partagé 25/jour/boîte,
-- premiers mails d'abord aux prospects avec aperçu ≥ 3 annonces) et « prospect_mail_kind » (colonne mail_kind : apercu / standard).
