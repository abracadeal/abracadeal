-- Motif de retrait d'une annonce, demandé au vendeur au moment de la suppression.
-- Sert aux statistiques (ex. « vendu grâce à Abracadeal ») ; lisible uniquement par les admins.
create table if not exists public.listing_removal_feedback (
  id bigint generated always as identity primary key,
  listing_id uuid not null,
  owner_id uuid not null default auth.uid(),
  reason text not null check (reason in ('sold_abracadeal', 'sold_elsewhere', 'not_selling', 'other')),
  category text,
  created_at timestamptz not null default now()
);

alter table public.listing_removal_feedback enable row level security;

create policy "Owners record removal reason" on public.listing_removal_feedback
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Admins read removal reasons" on public.listing_removal_feedback
  for select to authenticated
  using (public.abracadeal_current_user_is_admin());

revoke all on public.listing_removal_feedback from anon;
grant insert on public.listing_removal_feedback to authenticated;
grant select on public.listing_removal_feedback to authenticated;
