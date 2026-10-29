-- 29/10/2026 (Anthony) : bilan mensuel envoyé à chaque pro, pour qu'il voie ce qu'Abracadeal lui apporte
-- (argument principal à la fin des 12 mois gratuits). + comptage des partages d'annonces.

-- 1) Partages comptés (une fois par visiteur, annonce et jour, comme les vues ; le propriétaire n'est pas compté).
alter table public.listing_events drop constraint if exists listing_events_kind_check;
alter table public.listing_events add constraint listing_events_kind_check check (kind = any (array['view','phone','call','share']));

create or replace function public.track_listing_event(p_listing_id uuid, p_kind text, p_visitor text default null)
returns void language plpgsql security definer set search_path to '' as $function$
declare v_owner uuid; v_status text; v_key text; v_uid uuid := auth.uid();
begin
  if p_kind not in ('view','phone','call','share') then return; end if;
  select owner_id,status into v_owner,v_status from public.listings where id=p_listing_id;
  if v_owner is null or v_status<>'active' then return; end if;
  if v_uid is not null and (v_uid=v_owner or public.is_admin()) then return; end if;
  v_key := coalesce(v_uid::text, 'v:'||left(regexp_replace(coalesce(p_visitor,''),'[^A-Za-z0-9-]','','g'),64));
  if v_key='v:' then return; end if;
  -- garde-fou anti-abus : 400 événements max par visiteur et par jour
  if (select count(*) from public.listing_events where viewer_key=v_key and day=(now() at time zone 'Europe/Paris')::date) >= 400 then return; end if;
  insert into public.listing_events(listing_id,owner_id,kind,viewer_key) values(p_listing_id,v_owner,p_kind,v_key)
  on conflict do nothing;
end $function$;

create or replace function private.fr_int(n bigint) returns text language sql immutable set search_path to '' as $$
  select replace(to_char(n, 'FM999,999,999'), ',', ' ')
$$;
create or replace function private.html_esc(t text) returns text language sql immutable set search_path to '' as $$
  select replace(replace(replace(replace(coalesce(t,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;


-- 2) Bilan du mois écoulé, mis dans la file des mails Pro (type custom_message, envoyé par process-pro-transactional-emails).
--    Seulement pour les pros qui ont eu au moins une vue dans le mois. Un seul bilan par pro et par mois (event_key unique).
create or replace function private.queue_pro_monthly_reports(p_month date default null)
returns integer language plpgsql security definer set search_path to '' as $function$
declare
  v_from date := date_trunc('month', coalesce(p_month, ((now() at time zone 'Europe/Paris')::date - interval '1 month')::date))::date;
  v_to date := (v_from + interval '1 month')::date;
  v_mois text := (array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'])[extract(month from v_from)::int];
  v_de text := case when v_mois ~ '^[aeiouy]' then 'd’' else 'de ' end;
  r record; v_bullets jsonb; v_paras jsonb; v_top text; v_n int := 0;
begin
  for r in
    select p.id uid,
      (select count(*) from public.listing_events e where e.owner_id=p.id and e.kind='view'  and e.day>=v_from and e.day<v_to) views,
      (select count(*) from public.listing_events e where e.owner_id=p.id and e.kind='phone' and e.day>=v_from and e.day<v_to) phones,
      (select count(*) from public.listing_events e where e.owner_id=p.id and e.kind='call'  and e.day>=v_from and e.day<v_to) calls,
      (select count(*) from public.listing_events e where e.owner_id=p.id and e.kind='share' and e.day>=v_from and e.day<v_to) shares,
      (select count(*) from public.conversations c where c.seller_id=p.id and c.created_at>=v_from::timestamptz and c.created_at<v_to::timestamptz) messages,
      (select count(*) from public.favorites f join public.listings l on l.id=f.listing_id where l.owner_id=p.id and f.user_id<>p.id
         and f.created_at>=v_from::timestamptz and f.created_at<v_to::timestamptz) favs,
      (select count(*) from public.listings l where l.owner_id=p.id and l.status='active') active
    from public.profiles p
    where p.account_type='professionnel' and not coalesce(p.is_admin,false)
  loop
    continue when r.views = 0;
    v_bullets := '[]'::jsonb;
    v_bullets := v_bullets || jsonb_build_array(format('<strong>%s</strong> vue%s de vos annonces', private.fr_int(r.views), case when r.views>1 then 's' else '' end));
    if r.phones>0 then v_bullets := v_bullets || jsonb_build_array(format('<strong>%s</strong> personne%s %s affiché votre numéro', private.fr_int(r.phones), case when r.phones>1 then 's' else '' end, case when r.phones>1 then 'ont' else 'a' end)); end if;
    if r.calls>0 then v_bullets := v_bullets || jsonb_build_array(format('<strong>%s</strong> appel%s lancé%s depuis le site', private.fr_int(r.calls), case when r.calls>1 then 's' else '' end, case when r.calls>1 then 's' else '' end)); end if;
    if r.messages>0 then v_bullets := v_bullets || jsonb_build_array(format('<strong>%s</strong> message%s reçu%s', private.fr_int(r.messages), case when r.messages>1 then 's' else '' end, case when r.messages>1 then 's' else '' end)); end if;
    if r.favs>0 then v_bullets := v_bullets || jsonb_build_array(format('<strong>%s</strong> mise%s en favori', private.fr_int(r.favs), case when r.favs>1 then 's' else '' end)); end if;
    if r.shares>0 then v_bullets := v_bullets || jsonb_build_array(format('<strong>%s</strong> partage%s de vos annonces', private.fr_int(r.shares), case when r.shares>1 then 's' else '' end)); end if;

    select string_agg(format('<strong>%s</strong> (%s vue%s)', private.html_esc(t.title), private.fr_int(t.n), case when t.n>1 then 's' else '' end), ', ' order by t.n desc)
      into v_top
      from (select l.title, count(*) n from public.listing_events e join public.listings l on l.id=e.listing_id
            where e.owner_id=r.uid and e.kind='view' and e.day>=v_from and e.day<v_to
            group by l.id, l.title order by 2 desc limit 3) t;

    if v_top is not null then v_bullets := v_bullets || jsonb_build_array('Les plus vues : ' || v_top); end if;
    v_paras := jsonb_build_array(format('Voici ce que vos annonces sur Abracadeal vous ont apporté en %s (%s annonce%s en ligne actuellement) :',
                 v_mois, private.fr_int(r.active), case when r.active>1 then 's' else '' end));

    insert into public.pro_email_outbox(event_key, user_id, email_type, payload, status, available_at)
    values ('monthly-report:' || r.uid || ':' || to_char(v_from,'YYYY-MM'), r.uid, 'custom_message',
            jsonb_build_object('subject', format('Votre bilan Abracadeal %s%s', v_de, v_mois),
                               'title', format('Votre bilan %s%s', v_de, v_mois),
                               'paras', v_paras, 'bullets', v_bullets),
            'pending', now())
    on conflict (event_key) do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $function$;

-- 3) Le 1er de chaque mois vers 8 h 37 (heure de Paris en hiver ; 9 h 37 en été).
select cron.schedule('abracadeal-pro-monthly-report', '37 7 1 * *', 'select private.queue_pro_monthly_reports();');
