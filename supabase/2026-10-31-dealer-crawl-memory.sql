-- New dealer readers only; all existing one-pass readers keep their current behaviour.
-- The JSON checkpoint contains this feed's pending URLs and replayable raw rows, not login credentials.
begin;
create table public.pro_stock_crawl_state (
 feed_id uuid primary key references public.pro_stock_feeds(id) on delete cascade,
 state jsonb not null check (jsonb_typeof(state) = 'object'),
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.pro_stock_crawl_state enable row level security;
revoke all on public.pro_stock_crawl_state from public, anon, authenticated;
grant select, insert, update, delete on public.pro_stock_crawl_state to service_role;
comment on table public.pro_stock_crawl_state is 'Resumable scoped dealer crawl. Service role only; compare updated_at before checkpoint writes. No archival before state.completed.';
commit;
