-- 08/11/2026 (Anthony) : nouvelle grille Services & Artisans (HT), nouveaux prix Stripe (anciens archivés).
-- 1 annonce 19,99 -> 4,99 · pack 5 69,99 -> 19,99 · pack 10 99,99 -> 29,99 · nouvel abonnement 30 annonces 19,99 €/mois.
update public.commerce_offers set amount_cents=499,  stripe_price_id='price_1UZWqD1ebJH1208ITWErss6A', updated_at=now() where code='services_1';
update public.commerce_offers set amount_cents=1999, stripe_price_id='price_1UZWqG1ebJH1208I6rUtuda9', updated_at=now() where code='services_5';
update public.commerce_offers set amount_cents=2999, stripe_price_id='price_1UZWqI1ebJH1208IX6diaL1o', updated_at=now() where code='services_10';
insert into public.pro_subscription_plans(code,label,active,currency,sort_order,offer_group,photo_limit,amount_cents,listing_limit,category_scope,stripe_price_id,founder_eligible,stripe_payment_link_id,stripe_payment_link_url)
values('services_30','Services & Artisans — 30 annonces actives — 19,99 € HT/mois',true,'eur',610,'services',10,1999,30,array['services'],'price_1UZWqM1ebJH1208InoU9Okhc',false,'checkout_session:services_30','')
on conflict (code) do nothing;
insert into public.commerce_offers(code,label,active,audience,currency,metadata,quantity,recurring,offer_type,sort_order,photo_limit,amount_cents,category_group,stripe_price_id)
values('services_30','Services & Artisans — jusqu’à 30 annonces actives',true,'professionnel','eur','{"billing":"HT"}'::jsonb,30,true,'subscription',240,10,1999,'services','price_1UZWqM1ebJH1208InoU9Okhc')
on conflict (code) do nothing;
