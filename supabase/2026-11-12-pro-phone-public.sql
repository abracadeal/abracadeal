-- 12/11/2026 (Claude, accord d'Anthony) : numéro des annonces PRO visible sans connexion
-- (particuliers : connexion toujours obligatoire). Quota anti-aspiration par adresse IP pour les visiteurs.
-- Nouveau compteur « phone_login » = a cliqué « Voir le numéro » mais ne s'est pas connecté.
-- Correctif : « message » manquait dans la contrainte (le compteur « Envoyer un message » n'enregistrait rien).

create table if not exists private.listing_phone_anon_views(
  ip_hash text not null, phone_hash text not null, viewed_at timestamptz not null default now(),
  primary key(ip_hash, phone_hash));
create index if not exists listing_phone_anon_views_time_idx on private.listing_phone_anon_views(viewed_at);

create or replace function private.check_listing_phone_anon_quota(p_phone text)
returns void language plpgsql set search_path to '' as $f$
declare
 v_hdr json := nullif(current_setting('request.headers', true),'')::json;
 v_ip text := trim(split_part(coalesce(v_hdr->>'cf-connecting-ip', v_hdr->>'x-forwarded-for', v_hdr->>'x-real-ip',''),',',1));
 v_key text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 v_ip_hash text; v_hash text; v_now timestamptz := clock_timestamp(); v_short int; v_day int;
begin
 if v_ip = '' then raise exception 'Connexion requise'; end if;
 if v_key = '' then return; end if;
 if left(v_key,2)='00' then v_key:=substr(v_key,3); end if;
 if v_key ~ '^0[1-9][0-9]{8}$' then v_key:='33'||substr(v_key,2);
 elsif v_key ~ '^330[1-9][0-9]{8}$' then v_key:='33'||substr(v_key,4); end if;
 v_ip_hash := encode(sha256(convert_to('abraca-ip:'||v_ip,'UTF8')),'hex');
 v_hash := encode(sha256(convert_to(v_key,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('listing-phone-anon:'||v_ip_hash,0));
 delete from private.listing_phone_anon_views where viewed_at < v_now - interval '2 days';
 if exists(select 1 from private.listing_phone_anon_views where ip_hash=v_ip_hash and phone_hash=v_hash and viewed_at>v_now-interval '24 hours') then return; end if;
 select count(*) filter(where viewed_at>v_now-interval '10 minutes'), count(*) into v_short, v_day
   from private.listing_phone_anon_views where ip_hash=v_ip_hash and viewed_at>v_now-interval '24 hours';
 if v_short>=10 or v_day>=25 then
  raise exception 'Vous avez consulté beaucoup de numéros en peu de temps. Connectez-vous pour continuer.';
 end if;
 insert into private.listing_phone_anon_views(ip_hash,phone_hash,viewed_at) values(v_ip_hash,v_hash,v_now)
 on conflict(ip_hash,phone_hash) do update set viewed_at=excluded.viewed_at;
end $f$;

create or replace function public.get_listing_phone(p_listing_id uuid)
returns text language plpgsql security definer set search_path to '' as $function$
declare
 v_uid uuid:=auth.uid();
 v_owner uuid; v_status text; v_visibility text; v_show boolean; v_phone text; v_seller text; v_is_pro boolean;
begin
 select l.owner_id,l.status,l.visibility_scope,l.show_phone,lc.phone,l.seller_type
 into v_owner,v_status,v_visibility,v_show,v_phone,v_seller
 from public.listings l left join public.listing_contacts lc on lc.listing_id=l.id where l.id=p_listing_id;
 if v_owner is null then raise exception 'Annonce introuvable'; end if;
 if v_uid is null then
  -- visiteur non connecté : seulement les annonces publiques d'un vrai compte pro
  select (v_seller='professionnel' and p.account_type='professionnel') into v_is_pro from public.profiles p where p.id=v_owner;
  if not coalesce(v_is_pro,false) or v_visibility='pro' then raise exception 'Connexion requise'; end if;
  if v_status<>'active' then raise exception 'Annonce indisponible'; end if;
  if not coalesce(v_show,false) then return null; end if;
  if v_phone is not null then perform private.check_listing_phone_anon_quota(v_phone); end if;
  return v_phone;  -- le compteur « phone » est enregistré par track_listing_event côté site
 end if;
 if v_uid=v_owner or public.is_admin() then return v_phone; end if;
 if v_status<>'active' then raise exception 'Annonce indisponible'; end if;
 if v_visibility='pro' and not public.b2b_is_professional(v_uid) then raise exception 'Annonce réservée aux professionnels'; end if;
 if not coalesce(v_show,false) then return null; end if;
 if v_phone is not null then
  perform private.check_listing_phone_quota(v_uid,v_phone);
  insert into public.listing_events(listing_id,owner_id,kind,viewer_key) values(p_listing_id,v_owner,'phone',v_uid::text) on conflict do nothing;
 end if;
 return v_phone;
end $function$;

create or replace function public.get_listing_contact_details(p_listing_id uuid)
returns json language plpgsql security definer set search_path to '' as $function$
declare v_phone text; v_owner uuid; v_seller text; v_agency text; v_mail text;
begin
  -- mêmes contrôles, quota et compteur que « Voir le numéro » (connexion exigée sauf annonces pro)
  v_phone := public.get_listing_phone(p_listing_id);
  if v_phone is null then return json_build_object('phone',null); end if;
  select l.owner_id,l.seller_type,lc.agent_email into v_owner,v_seller,v_mail
    from public.listings l left join public.listing_contacts lc on lc.listing_id=l.id where l.id=p_listing_id;
  if v_seller='professionnel' then
    select p.phone into v_agency from public.profiles p where p.id=v_owner;
    if public.abracadeal_normalize_phone(v_agency) is not distinct from public.abracadeal_normalize_phone(v_phone) then v_agency:=null; end if;
  else v_agency:=null; v_mail:=null; end if;
  return json_build_object('phone',v_phone,'agency_phone',v_agency,'agent_email',v_mail);
end $function$;

alter table public.listing_events drop constraint if exists listing_events_kind_check;
alter table public.listing_events add constraint listing_events_kind_check
  check (kind = any (array['view','phone','call','share','message','phone_login']));

create or replace function public.track_listing_event(p_listing_id uuid, p_kind text, p_visitor text default null)
returns void language plpgsql security definer set search_path to '' as $function$
declare v_owner uuid; v_status text; v_key text; v_uid uuid := auth.uid();
begin
  if p_kind not in ('view','phone','call','share','message','phone_login') then return; end if;
  select owner_id,status into v_owner,v_status from public.listings where id=p_listing_id;
  if v_owner is null or v_status<>'active' then return; end if;
  if v_uid is not null and (v_uid=v_owner or public.is_admin()) then return; end if;
  v_key := coalesce(v_uid::text, 'v:'||left(regexp_replace(coalesce(p_visitor,''),'[^A-Za-z0-9-]','','g'),64));
  if v_key='v:' then return; end if;
  if (select count(*) from public.listing_events where viewer_key=v_key and day=(now() at time zone 'Europe/Paris')::date) >= 400 then return; end if;
  insert into public.listing_events(listing_id,owner_id,kind,viewer_key) values(p_listing_id,v_owner,p_kind,v_key)
  on conflict do nothing;
end $function$;

-- Les 4 anciens « numéros affichés » de visiteurs non connectés n'ont jamais vu le numéro.
update public.listing_events set kind='phone_login' where kind='phone' and viewer_key like 'v:%' and created_at < '2026-11-12 16:00+01';

grant execute on function public.get_listing_phone(uuid) to anon, authenticated;
grant execute on function public.get_listing_contact_details(uuid) to anon, authenticated;
