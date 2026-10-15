-- 1) Plus de réservation Fondateur à la vérification du SIRET : la place est prise au choix de la formule
--    (claim_founder_slot), puis libérée si le paiement Stripe n'aboutit pas. Supprime aussi l'ancienne règle -50 % / 24 mois.
create or replace function public.enroll_verified_founder()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  return new;
end;
$function$;

-- 2) Ancienne surcharge integer de abraca_founder_photo_cap : alignée sur la version smallint (limite du pack)
create or replace function public.abraca_founder_photo_cap(p_owner uuid, p_category text, p_seller text, p_requested integer)
 returns integer language sql stable security definer set search_path to 'public'
as $function$
  select public.abraca_founder_photo_cap(p_owner, p_category, p_seller, p_requested::smallint)::integer;
$function$;

-- 3) Les réservations existantes passent à la règle actuelle (12 mois gratuits, pas de remise ensuite)
update public.founder_enrollments
   set discount_until = free_until, discount_percent = 0
 where discount_percent <> 0 and revoked_at is null;
