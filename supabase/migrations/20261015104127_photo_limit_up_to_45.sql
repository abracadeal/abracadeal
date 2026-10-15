-- Formule 100 et offre sur devis : jusqu'à 45 photos par annonce
alter table public.listings drop constraint listings_photo_limit_check;
alter table public.listings add constraint listings_photo_limit_check check (photo_limit >= 3 and photo_limit <= 45);

update public.pro_subscription_plans set photo_limit = 45, updated_at = now() where code in ('pro_100','pro_250');
update public.commerce_offers set photo_limit = 45, updated_at = now() where code in ('pro_100','pro_250');

create or replace function public.abraca_founder_photo_cap(p_owner uuid, p_category text, p_seller text, p_requested smallint)
 returns smallint
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_cap int;
begin
 if p_category='vacances' or p_seller<>'professionnel' then return p_requested; end if;
 select max(pp.photo_limit) into v_cap
 from public.pro_subscriptions ps join public.pro_subscription_plans pp on pp.code=ps.plan_code
 where ps.user_id=p_owner and ps.status in ('active','trialing') and p_category=any(pp.category_scope)
   and (ps.current_period_end is null or ps.current_period_end>now());
 if v_cap is not null then return greatest(3,least(45,v_cap)); end if;
 return p_requested;
end;
$function$;
