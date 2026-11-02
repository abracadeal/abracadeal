-- 02/11/2026 (Anthony : gagner de la place sur les photos) : les vignettes n'affichent que la 1re photo de chaque annonce ;
-- miniatures créées seulement pour celle-ci, et celles des autres photos supprimées par le ménage habituel (generate-listing-thumbs).
create or replace function public.thumbs_next_batch(p_limit integer)
 returns table(storage_path text) language sql stable security definer set search_path to ''
as $$
  with firsts as (
    select distinct on (lp.listing_id) lp.storage_path, lp.created_at
      from public.listing_photos lp
     where coalesce(lp.storage_bucket,'listing-images') = 'listing-images'
       and lp.storage_path !~* '^https?://'
     order by lp.listing_id, lp.position nulls last, lp.created_at
  )
  select f.storage_path from firsts f
    left join private.listing_photo_thumbs t on t.storage_path = f.storage_path
   where t.storage_path is null or (t.error is not null and t.attempts < 3)
   group by f.storage_path
   order by max(f.created_at) desc
   limit greatest(1, least(p_limit, 50))
$$;
create or replace function public.thumbs_orphans(p_limit integer)
 returns table(storage_path text) language sql stable security definer set search_path to ''
as $$
  select t.storage_path from private.listing_photo_thumbs t
   where t.error is null
     and not exists (
       select 1 from (
         select distinct on (lp.listing_id) lp.storage_path
           from public.listing_photos lp
          where coalesce(lp.storage_bucket,'listing-images') = 'listing-images'
          order by lp.listing_id, lp.position nulls last, lp.created_at
       ) f where f.storage_path = t.storage_path)
   limit greatest(1, least(p_limit, 200))
$$;
