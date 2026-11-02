-- 02/11/2026 : garder les anciennes adresses courtes d'un pro (liens déjà envoyés par mail) quand on change son adresse.
alter table public.pro_showrooms add column if not exists old_slugs text[] not null default '{}';
create or replace function public.pro_slug_resolve(p_slug text)
 returns uuid language sql stable security definer set search_path to ''
as $$
  select s.user_id from public.pro_showrooms s join public.profiles p on p.id=s.user_id and p.account_type='professionnel'
   where lower(s.slug)=lower(trim(p_slug)) or lower(trim(p_slug)) = any(s.old_slugs)
   order by (lower(s.slug)=lower(trim(p_slug))) desc
   limit 1;
$$;
