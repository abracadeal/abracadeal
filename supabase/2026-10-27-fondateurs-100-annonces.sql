-- 27/10/2026 (appliqué : migrations founder_offer_direct_50 + founder_free_period_100_listings)
-- 1) pro_20 n'est plus couverte par l'offre Fondateurs (reste au tarif public).
update public.pro_subscription_plans set founder_eligible=false, updated_at=now() where code='pro_20';
-- 2) public.enforce_founder_50_listing_limit() : plafond effectif d'un abonnement Fondateur en période gratuite
--    (status 'trialing') = greatest(listing_limit, 100). Au-delà de 100 pendant la période gratuite :
--    message « contactez-nous pour une offre adaptée ». Voir la définition complète dans la base.
