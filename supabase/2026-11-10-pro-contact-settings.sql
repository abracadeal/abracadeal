-- 10/11/2026 (Anthony) : numéro affiché sur les annonces d'un pro, en plus du numéro de l'agence (profil). Appliqué en production.
create table if not exists public.pro_contact_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  listing_phone text,
  updated_at timestamptz not null default now()
);
alter table public.pro_contact_settings enable row level security;
create policy pro_contact_settings_owner_select on public.pro_contact_settings for select using (auth.uid() = user_id or public.is_admin());
create policy pro_contact_settings_admin_all on public.pro_contact_settings for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.pro_contact_settings from anon;
