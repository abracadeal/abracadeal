-- 18/10/2026 — Miniatures des photos d'annonces (vignettes plus légères sur mobile)
-- Bucket public « listing-thumbs » (écriture réservée au serveur), suivi des miniatures générées,
-- fonctions appelées par l'edge function generate-listing-thumbs, cron toutes les minutes (5 photos par passage).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-thumbs', 'listing-thumbs', true, 524288, array['image/jpeg'])
on conflict (id) do nothing;

create table if not exists private.listing_photo_thumbs (
  storage_path text primary key,
  created_at timestamptz not null default now(),
  attempts integer not null default 0,
  error text
);
alter table private.listing_photo_thumbs enable row level security;
revoke all on private.listing_photo_thumbs from public, anon, authenticated;

-- Photos publiques sans miniature (ou en échec, 3 essais maximum), les plus récentes d'abord.
create or replace function public.thumbs_next_batch(p_limit integer)
returns table(storage_path text) language sql stable security definer set search_path to ''
as $$
  select lp.storage_path
    from public.listing_photos lp
    left join private.listing_photo_thumbs t on t.storage_path = lp.storage_path
   where coalesce(lp.storage_bucket,'listing-images') = 'listing-images'
     and lp.storage_path !~* '^https?://'
     and (t.storage_path is null or (t.error is not null and t.attempts < 3))
   group by lp.storage_path
   order by max(lp.created_at) desc
   limit greatest(1, least(p_limit, 50))
$$;

create or replace function public.thumbs_mark(p_path text, p_error text)
returns void language sql security definer set search_path to ''
as $$
  insert into private.listing_photo_thumbs(storage_path, attempts, error) values (p_path, 1, p_error)
  on conflict (storage_path) do update
    set attempts = private.listing_photo_thumbs.attempts + 1, error = excluded.error, created_at = now()
$$;

-- Miniatures dont la photo d'origine n'existe plus.
create or replace function public.thumbs_orphans(p_limit integer)
returns table(storage_path text) language sql stable security definer set search_path to ''
as $$
  select t.storage_path from private.listing_photo_thumbs t
   where t.error is null
     and not exists (select 1 from public.listing_photos lp
                      where lp.storage_path = t.storage_path
                        and coalesce(lp.storage_bucket,'listing-images') = 'listing-images')
   limit greatest(1, least(p_limit, 200))
$$;

create or replace function public.thumbs_forget(p_path text)
returns void language sql security definer set search_path to ''
as $$ delete from private.listing_photo_thumbs where storage_path = p_path $$;

revoke execute on function public.thumbs_next_batch(integer), public.thumbs_mark(text, text),
  public.thumbs_orphans(integer), public.thumbs_forget(text) from public, anon, authenticated;
grant execute on function public.thumbs_next_batch(integer), public.thumbs_mark(text, text),
  public.thumbs_orphans(integer), public.thumbs_forget(text) to service_role;

select cron.unschedule('abracadeal-listing-thumbs') where exists (select 1 from cron.job where jobname = 'abracadeal-listing-thumbs');
select cron.schedule('abracadeal-listing-thumbs', '* * * * *', $cron$
  select net.http_post(
    url := 'https://jplzvxmpbpjssyinozap.supabase.co/functions/v1/generate-listing-thumbs',
    headers := jsonb_build_object('Content-Type','application/json','x-internal-key',(select secret_value from public.integration_secrets where name='pro_stock_moderation_internal')),
    body := '{"limit":5}'::jsonb,
    timeout_milliseconds := 60000);
$cron$);
