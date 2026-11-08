-- 08/11/2026 (Anthony : « Oui on fait ces prix là ») — grille v3, prix HT.
-- Auto/Moto/Immo : 5 annonces gratuites, 25 = 49 €, 50 = 89 €, 100 = 149 €/mois, au-delà sur devis.
-- High-tech / Maison / Mode / Services : 10 annonces gratuites, 50 = 9,99 €, 200 = 24,99 €/mois ; annonce à l'unité 1,99 €.
-- Emploi : 1 offre gratuite, 4,99 € l'offre (30 j), illimité 29,99 €/mois. Vacances : 4,99 €/logement (formules 20/60 retirées).
-- Packs ponctuels retirés. Options de visibilité inchangées. Fondateurs inchangés (gratuits).

-- 1) Formules d'abonnement
insert into public.pro_subscription_plans(code,label,active,currency,sort_order,offer_group,photo_limit,amount_cents,listing_limit,category_scope,stripe_price_id,founder_eligible,stripe_payment_link_id,stripe_payment_link_url) values
 ('pro_25','25 annonces actives — 49 € HT/mois',true,'eur',5,'auto_moto_immo',30,4900,25,array['vehicules','immobilier'],'price_1UZcYo1ebJH1208I8vNwLSHN',false,'checkout_session:pro_25',''),
 ('hightech_50','High-tech — 50 annonces actives — 9,99 € HT/mois',true,'eur',111,'hightech',30,999,50,array['hightech'],'price_1UZcZ01ebJH1208Iwl5qW2fZ',false,'checkout_session:hightech_50',''),
 ('hightech_200','High-tech — 200 annonces actives — 24,99 € HT/mois',true,'eur',112,'hightech',30,2499,200,array['hightech'],'price_1UZcZ21ebJH1208IZQRsQEIn',false,'checkout_session:hightech_200',''),
 ('maison_50','Maison & Déco — 50 annonces actives — 9,99 € HT/mois',true,'eur',211,'maison',30,999,50,array['maison'],'price_1UZcZ41ebJH1208IOReVvAmf',false,'checkout_session:maison_50',''),
 ('maison_200','Maison & Déco — 200 annonces actives — 24,99 € HT/mois',true,'eur',212,'maison',30,2499,200,array['maison'],'price_1UZcZ61ebJH1208INnMB8um7',false,'checkout_session:maison_200',''),
 ('mode_50','Mode — 50 annonces actives — 9,99 € HT/mois',true,'eur',311,'mode',30,999,50,array['mode'],'price_1UZcZ71ebJH1208Ix0ZLZdHr',false,'checkout_session:mode_50',''),
 ('mode_200','Mode — 200 annonces actives — 24,99 € HT/mois',true,'eur',312,'mode',30,2499,200,array['mode'],'price_1UZcZ91ebJH1208IHcdOKKTF',false,'checkout_session:mode_200',''),
 ('services_50','Services & Artisans — 50 annonces actives — 9,99 € HT/mois',true,'eur',611,'services',10,999,50,array['services'],'price_1UZcZB1ebJH1208IMuNdw3Bo',false,'checkout_session:services_50',''),
 ('services_200','Services & Artisans — 200 annonces actives — 24,99 € HT/mois',true,'eur',612,'services',10,2499,200,array['services'],'price_1UZcZD1ebJH1208I34NyfG2z',false,'checkout_session:services_200',''),
 ('emploi_illimite','Emploi — offres illimitées — 29,99 € HT/mois',true,'eur',511,'emploi',30,2999,100000,array['emploi'],'price_1UZcYw1ebJH1208ICKaNIwv6',false,'checkout_session:emploi_illimite','')
on conflict (code) do update set label=excluded.label,active=true,amount_cents=excluded.amount_cents,listing_limit=excluded.listing_limit,stripe_price_id=excluded.stripe_price_id,photo_limit=excluded.photo_limit,updated_at=now();

update public.pro_subscription_plans set amount_cents=8900,label='50 annonces actives — 89 € HT/mois',stripe_price_id='price_1UZcYr1ebJH1208IsBKH1Qzp',updated_at=now() where code='pro_50';
update public.pro_subscription_plans set amount_cents=14900,label='100 annonces actives — 149 € HT/mois',stripe_price_id='price_1UZcYt1ebJH1208Io4jAnipq',updated_at=now() where code='pro_100';
update public.pro_subscription_plans set active=false,updated_at=now()
 where code in ('pro_20','hightech_30','hightech_100','maison_30','maison_100','mode_30','mode_100','services_30','emploi_30','emploi_100','emploi_250','emploi_500','vacances_20','vacances_60');

-- 2) Offres affichées (commerce_offers)
insert into public.commerce_offers(code,label,active,audience,currency,metadata,quantity,recurring,offer_type,sort_order,photo_limit,amount_cents,category_group,stripe_price_id) values
 ('pro_25','25 annonces actives',true,'professionnel','eur','{"billing":"HT"}',25,true,'subscription',15,30,4900,'auto_moto_immo','price_1UZcYo1ebJH1208I8vNwLSHN'),
 ('hightech_50','High-tech — jusqu’à 50 annonces actives',true,'professionnel','eur','{"billing":"HT"}',50,true,'subscription',111,30,999,'hightech','price_1UZcZ01ebJH1208Iwl5qW2fZ'),
 ('hightech_200','High-tech — jusqu’à 200 annonces actives',true,'professionnel','eur','{"billing":"HT"}',200,true,'subscription',112,30,2499,'hightech','price_1UZcZ21ebJH1208IZQRsQEIn'),
 ('maison_50','Maison & Déco — jusqu’à 50 annonces actives',true,'professionnel','eur','{"billing":"HT"}',50,true,'subscription',211,30,999,'maison','price_1UZcZ41ebJH1208IOReVvAmf'),
 ('maison_200','Maison & Déco — jusqu’à 200 annonces actives',true,'professionnel','eur','{"billing":"HT"}',200,true,'subscription',212,30,2499,'maison','price_1UZcZ61ebJH1208INnMB8um7'),
 ('mode_50','Mode — jusqu’à 50 annonces actives',true,'professionnel','eur','{"billing":"HT"}',50,true,'subscription',311,30,999,'mode','price_1UZcZ71ebJH1208Ix0ZLZdHr'),
 ('mode_200','Mode — jusqu’à 200 annonces actives',true,'professionnel','eur','{"billing":"HT"}',200,true,'subscription',312,30,2499,'mode','price_1UZcZ91ebJH1208IHcdOKKTF'),
 ('services_50','Services & Artisans — jusqu’à 50 annonces actives',true,'professionnel','eur','{"billing":"HT"}',50,true,'subscription',241,10,999,'services','price_1UZcZB1ebJH1208IMuNdw3Bo'),
 ('services_200','Services & Artisans — jusqu’à 200 annonces actives',true,'professionnel','eur','{"billing":"HT"}',200,true,'subscription',242,10,2499,'services','price_1UZcZD1ebJH1208I34NyfG2z'),
 ('emploi_illimite','Emploi — offres illimitées',true,'professionnel','eur','{"billing":"HT"}',100000,true,'subscription',511,30,2999,'emploi','price_1UZcYw1ebJH1208ICKaNIwv6')
on conflict (code) do update set label=excluded.label,active=true,amount_cents=excluded.amount_cents,quantity=excluded.quantity,stripe_price_id=excluded.stripe_price_id,updated_at=now();

update public.commerce_offers set amount_cents=8900, stripe_price_id='price_1UZcYr1ebJH1208IsBKH1Qzp',updated_at=now() where code='pro_50';
update public.commerce_offers set amount_cents=14900,stripe_price_id='price_1UZcYt1ebJH1208Io4jAnipq',updated_at=now() where code='pro_100';
update public.commerce_offers set amount_cents=499,  stripe_price_id='price_1UZcYv1ebJH1208IACIVmg2X',updated_at=now() where code='emploi_1';
update public.commerce_offers set amount_cents=199,  stripe_price_id='price_1UZcZH1ebJH1208I6jKppVzC',updated_at=now() where code='hightech_1';
update public.commerce_offers set amount_cents=199,  stripe_price_id='price_1UZcZJ1ebJH1208IQGj0RpTj',updated_at=now() where code='maison_1';
update public.commerce_offers set amount_cents=199,  stripe_price_id='price_1UZcZK1ebJH1208IdmgC6pQJ',updated_at=now() where code='mode_1';
update public.commerce_offers set amount_cents=199,  stripe_price_id='price_1UZcZM1ebJH1208IPK9hdoQV',updated_at=now() where code='services_1';
update public.commerce_offers set active=false,updated_at=now()
 where code in ('pro_20','hightech_10','hightech_pack30','hightech_30','hightech_100','maison_10','maison_pack30','maison_30','maison_100',
                'mode_10','mode_pack30','mode_30','mode_100','services_5','services_10','services_30',
                'emploi_5','emploi_10','emploi_30','emploi_100','emploi_250','emploi_500');

-- 3) Annonces gratuites permanentes (dans le domaine du pro, sans abonnement) :
--    Auto/Moto/Immo 5, Emploi 1, High-tech/Maison/Mode/Services 10.
create or replace function public.abraca_pro_free_allowance(p_group text)
 returns integer language sql immutable as $$
 select case p_group when 'auto_moto_immo' then 5 when 'emploi' then 1
   when 'hightech' then 10 when 'maison' then 10 when 'mode' then 10 when 'services' then 10 else 0 end $$;

create or replace function public.abraca_consume_pro_listing_credit()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_group text; v_credits integer; v_photo integer; v_has_plan boolean:=false; v_admin boolean:=false;
  v_sector text; v_in_primary_sector boolean:=false; v_free integer; v_used integer;
begin
  if current_setting('abraca.revision_write',true)=txid_current()::text then return coalesce(new,old); end if;
  if new.seller_type<>'professionnel' or new.category='vacances' or new.status in ('archived','rejected') then return new; end if;

  select coalesce(is_admin,false),pro_sector into v_admin,v_sector from public.profiles where id=new.owner_id;
  if v_admin or exists(select 1 from public.internal_accounts where user_id=new.owner_id and exclude_from_counters) then return new; end if;
  if new.category='autres' then raise exception 'Les professionnels doivent choisir la catégorie correspondant à leur activité.' using errcode='23514'; end if;

  v_group:=case new.category when 'vehicules' then 'auto_moto_immo' when 'immobilier' then 'auto_moto_immo'
    when 'emploi' then 'emploi' when 'services' then 'services' when 'hightech' then 'hightech'
    when 'maison' then 'maison' when 'mode' then 'mode' else null end;
  if v_group is null then return new; end if;

  v_in_primary_sector := case when v_sector='vehicules' then new.category='vehicules'
    when v_sector='immobilier' then new.category='immobilier' else v_sector=new.category end;

  if v_in_primary_sector then
    select exists(select 1 from public.pro_subscriptions ps join public.pro_subscription_plans pp on pp.code=ps.plan_code
      where ps.user_id=new.owner_id and ps.status in ('active','trialing') and new.category=any(pp.category_scope)
        and (ps.current_period_end is null or ps.current_period_end>now())) into v_has_plan;
    if v_has_plan then return new; end if;
    -- 08/11/2026 (grille v3) : annonces gratuites permanentes dans le domaine du pro.
    v_free:=public.abraca_pro_free_allowance(v_group);
    select count(*) into v_used from public.listings
     where owner_id=new.owner_id and seller_type='professionnel' and status not in ('archived','rejected')
       and revision_of is null and id is distinct from new.id
       and (case category when 'vehicules' then 'auto_moto_immo' when 'immobilier' then 'auto_moto_immo' else category end)=v_group;
    if v_used<v_free then return new; end if;
  end if;

  select credits,photo_limit into v_credits,v_photo from public.pro_listing_credit_wallet
   where user_id=new.owner_id and category_group=v_group for update;
  if coalesce(v_credits,0)<=0 then
    if v_in_primary_sector then
      raise exception 'Vous avez utilisé vos % annonces gratuites. Pour publier plus, choisissez une formule (Espace Pro → Tarifs).',public.abraca_pro_free_allowance(v_group) using errcode='23514';
    else
      raise exception 'Cette catégorie est hors de votre domaine Pro : achetez une annonce à l''unité pour publier ici.' using errcode='23514';
    end if;
  end if;
  update public.pro_listing_credit_wallet set credits=credits-1,updated_at=now() where user_id=new.owner_id and category_group=v_group;
  if v_photo is not null and v_photo>0 then new.photo_limit:=v_photo; end if;
  return new;
end;
$function$;

-- 4) Les 5 annonces offertes à l'inscription (crédits uniques) sont remplacées par les annonces gratuites permanentes.
drop trigger if exists abraca_pro_welcome_credits on public.profiles;
