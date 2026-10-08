alter table public.review_reports add column closed_at timestamptz;
update public.review_reports r set closed_at=now() from public.reviews v where v.id=r.review_id and v.status='hidden';
create function private.retention_close_review_reports() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='hidden' then update public.review_reports set closed_at=now() where review_id=new.id and closed_at is null;
 elsif new.status='active' then update public.review_reports set closed_at=null where review_id=new.id; end if;
 return new;
end $$;
create trigger retention_close_review_reports after update of status on public.reviews for each row execute function private.retention_close_review_reports();
revoke all on function private.retention_close_review_reports() from public,anon,authenticated,service_role;
create function private.retention_additional_purge(p_dry_run boolean) returns jsonb language plpgsql security invoker set search_path='' as $$
declare n integer; begin
 select count(*) into n from public.review_reports r join public.reviews v on v.id=r.review_id
 where r.closed_at<now()-interval '1 year' and not private.retention_held('review',r.review_id::text,v.seller_id)
 and not private.retention_held('report',r.id::text,r.reporter_id) and not private.retention_held('user',v.reviewer_id::text,v.reviewer_id);
 if not p_dry_run then delete from public.review_reports r using public.reviews v where v.id=r.review_id
 and r.closed_at<now()-interval '1 year' and not private.retention_held('review',r.review_id::text,v.seller_id)
 and not private.retention_held('report',r.id::text,r.reporter_id) and not private.retention_held('user',v.reviewer_id::text,v.reviewer_id); end if;
 return jsonb_build_object('review_reports',n);
end $$;
revoke all on function private.retention_additional_purge(boolean) from public,anon,authenticated,service_role;
create function private.retention_prospect_is_customer(p_email text) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from auth.users u where lower(u.email)=lower(p_email))
 or exists(select 1 from private.retention_evidence e join private.retention_accounts a on a.user_id=e.user_id
  where e.scope='user' and lower(e.snapshot->>'email')=lower(p_email) and a.closed_at>now()-interval '3 years');
$$;
revoke all on function private.retention_prospect_is_customer(text) from public,anon,authenticated,service_role;
-- Add the customer and review protections to the already-tested purge, without touching moderation publication.
do $$declare d text; begin
 select pg_get_functiondef('private.retention_purge(boolean)'::regprocedure) into d;
 d:=replace(d,'row.tbl,row.clock,row.keycol,coalesce(row.usercol,''null''),coalesce(row.listingcol,''null''))',
  'row.tbl,case when row.tbl=''prospection_prospects'' then ''case when private.retention_prospect_is_customer(email) then now() else greatest(created_at,last_inbound_contact_at) end'' else row.clock end,row.keycol,coalesce(row.usercol,''null''),coalesce(row.listingcol,''null''))');
 d:=replace(d,'result:=result||private.retention_expire_archives(p_dry_run);','result:=result||private.retention_additional_purge(p_dry_run)||private.retention_expire_archives(p_dry_run);');
 execute d;
 select pg_get_functiondef('private.capture_deleted_signature()'::regprocedure) into d;
 d:=replace(d,E'begin\n',E'begin\n if tg_op=''DELETE'' and current_setting(''abraca.retention_purge'',true)=txid_current()::text then return old; end if;\n');
 execute d;
end $$;
create or replace function private.purge_expired_listing_archives() returns integer language plpgsql security definer set search_path='' as $$
declare n integer; begin
 delete from private.listing_archives a where not a.legal_hold and a.retention_until<=now()
 and not private.retention_held('listing',a.listing_id::text,a.owner_id,a.listing_id)
 and not exists(select 1 from public.listings l where l.id=a.listing_id);
 get diagnostics n=row_count; return n;
end $$;
-- Audit hold changes, including who released a hold. The clock uses the last actual change.
create table private.retention_hold_audit (
 id bigint generated always as identity primary key,scope text,target_id text,actor uuid,
 action text,reason text,changed_at timestamptz not null default now()
);
alter table private.retention_hold_audit enable row level security;
revoke all on private.retention_hold_audit from public,anon,authenticated;
create function private.retention_log_hold() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.retention_hold_audit(scope,target_id,actor,action,reason)
 values(new.scope,new.target_id,auth.uid(),case when new.released_at is not null then 'released' else 'held' end,new.reason);
 return new;
end $$;
create trigger retention_log_hold after insert or update on private.retention_holds for each row execute function private.retention_log_hold();
revoke all on function private.retention_log_hold() from public,anon,authenticated,service_role;
select cron.schedule('abracadeal-data-retention','10 3 * * *',$$select private.retention_purge(false);$$);
select cron.schedule('abracadeal-data-retention-files','*/15 * * * *',$$select private.dispatch_retention_worker();$$);
