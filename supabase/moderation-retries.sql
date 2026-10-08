-- Retry incomplete safety checks independently of the original file/feed import.
create table private.moderation_retry_state (
 listing_id uuid primary key references public.listings(id) on delete cascade,
 attempts integer not null default 0,
 last_attempt_at timestamptz,
 next_attempt_at timestamptz not null default now(),
 request_id bigint
);
alter table private.moderation_retry_state enable row level security;
revoke all on private.moderation_retry_state from public,anon,authenticated;
-- Fingerprints contain hashes and photo IDs only, never feed credentials or original image URLs.
alter table public.listing_moderation add column if not exists stock_import_signature text;
alter table public.listing_moderation add column if not exists stock_import_photo_ids uuid[];

create or replace function private.dispatch_moderation_retries(p_batch_size integer default 20)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_row record; v_key text; v_url text; v_request bigint; v_count integer:=0;
begin
 -- A concurrent invocation must not dispatch the same batch twice.
 if not pg_try_advisory_xact_lock(hashtext('abracadeal-moderation-retries')) then return 0; end if;
 select secret_value into v_key from public.integration_secrets where name='pro_stock_moderation_internal';
 select decrypted_secret into v_url from vault.decrypted_secrets where name='abracadeal_project_url';
 if nullif(v_key,'') is null or nullif(v_url,'') is null then raise exception 'Configuration de relance de modération manquante'; end if;
 for v_row in
  select l.id
  from public.listings l
  left join public.listing_moderation m on m.listing_id=l.id
  left join private.moderation_retry_state q on q.listing_id=l.id
  where l.status='pending'
    and not coalesce(m.ai_checked,false)
    and not coalesce(m.safety_blocked,false)
    and private.moderation_user_allowed(l.owner_id)
    -- Allow an ongoing foreground scan/import to finish before taking over.
    and greatest(l.updated_at,coalesce(m.checked_at,l.updated_at)) <= now()-interval '5 minutes'
    and coalesce(q.next_attempt_at,'-infinity'::timestamptz) <= now()
  -- Fairness: untouched listings first, then the least recently attempted.
  order by q.last_attempt_at nulls first,l.created_at,l.id
  limit greatest(1,least(coalesce(p_batch_size,20),50))
  for update of l skip locked
 loop
  v_request:=net.http_post(
   url:=rtrim(v_url,'/')||'/functions/v1/moderate-listing',
   body:=jsonb_build_object('listing_id',v_row.id),
   headers:=jsonb_build_object('Content-Type','application/json','x-internal-moderation-key',v_key),
   timeout_milliseconds:=120000
  );
  insert into private.moderation_retry_state(listing_id,attempts,last_attempt_at,next_attempt_at,request_id)
  values(v_row.id,1,now(),date_trunc('minute',now())+interval '15 minutes',v_request)
  on conflict(listing_id) do update set attempts=private.moderation_retry_state.attempts+1,
   last_attempt_at=excluded.last_attempt_at,next_attempt_at=excluded.next_attempt_at,request_id=excluded.request_id;
  v_count:=v_count+1;
 end loop;
 return v_count;
end; $$;
revoke all on function private.dispatch_moderation_retries(integer) from public,anon,authenticated,service_role;
-- The postgres-owned cron calls the same safety function as interactive publishing.
select cron.schedule('abracadeal-moderation-retries','0,15,30,45 * * * *',
 $$select private.dispatch_moderation_retries(20);$$);
