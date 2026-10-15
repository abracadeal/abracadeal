-- Durcissement des RPC SECURITY DEFINER accessibles sans connexion.
-- Ces fonctions sont utilisées uniquement dans des parcours authentifiés.
revoke execute on function public.get_listing_phone(uuid) from anon;
revoke execute on function public.b2b_catalog(boolean) from anon;
revoke execute on function public.b2b_is_professional(uuid) from anon;
revoke execute on function public.is_admin() from anon;
