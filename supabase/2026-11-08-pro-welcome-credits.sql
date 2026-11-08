-- 08/11/2026 (Anthony) : 5 annonces offertes à chaque nouveau pro dont le secteur
-- principal est Services, High-tech, Maison, Mode ou Emploi (une seule fois par compte).
-- Véhicules / Immobilier ont déjà l'offre Fondateurs.
create table if not exists public.pro_welcome_credit_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  category_group text not null,
  quantity integer not null,
  granted_at timestamptz not null default now()
);
alter table public.pro_welcome_credit_grants enable row level security;

create or replace function public.abraca_grant_pro_welcome_credits()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare v_photo integer;
begin
  if new.account_type<>'professionnel' or new.pro_sector is null then return new; end if;
  if new.pro_sector not in ('services','hightech','maison','mode','emploi') then return new; end if;
  if exists(select 1 from public.pro_welcome_credit_grants where user_id=new.id) then return new; end if;
  select max(photo_limit) into v_photo from public.commerce_offers
   where active and audience='professionnel' and category_group=new.pro_sector and offer_type='single_listing';
  perform public.grant_pro_listing_credits(new.id,new.pro_sector,5,coalesce(v_photo,5));
  insert into public.pro_welcome_credit_grants(user_id,category_group,quantity) values(new.id,new.pro_sector,5);
  return new;
end;
$function$;

drop trigger if exists abraca_pro_welcome_credits on public.profiles;
create trigger abraca_pro_welcome_credits
 after insert or update of account_type, pro_sector on public.profiles
 for each row execute function public.abraca_grant_pro_welcome_credits();

-- Mycreativesite a déjà reçu 10 annonces (compte interne) : on le marque comme servi.
insert into public.pro_welcome_credit_grants(user_id,category_group,quantity)
select id,'services',0 from public.profiles where id='2f6369e2-98ba-422f-aafa-ba6ff931e7ca'
on conflict do nothing;
