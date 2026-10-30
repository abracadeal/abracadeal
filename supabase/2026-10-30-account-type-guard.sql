-- 30/10/2026 (Anthony) : « un pro est un pro, un particulier est un particulier ».
-- Un utilisateur ne peut plus changer lui-même le type de son compte (particulier <-> professionnel).
-- Le passage en Pro se fait uniquement par la fonction verify-professional (action « upgrade »,
-- SIRET/SIREN contrôlé dans le registre officiel, clé de service) ou par un administrateur.
create or replace function private.guard_profile_account_type()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if (select auth.role()) = 'service_role' or public.is_admin() then return new; end if;
  if new.account_type is distinct from old.account_type then
    raise exception using message = 'account_type_change_requires_verification';
  end if;
  return new;
end;
$$;

drop trigger if exists aab_guard_profile_account_type on public.profiles;
create trigger aab_guard_profile_account_type
  before update on public.profiles
  for each row execute function private.guard_profile_account_type();
