-- No cron is activated until the worker and transactional tests have passed.
create table private.retention_holds (
 scope text not null check(scope in ('user','listing','conversation','report','review','prospect','order','support')),
 target_id text not null, reason text not null check(length(reason)>=10),
 created_by uuid, created_at timestamptz not null default now(),
 review_at timestamptz not null default now()+interval '6 months', released_at timestamptz,
 primary key(scope,target_id)
);
create table private.retention_runs (
 id bigint generated always as identity primary key, started_at timestamptz not null default now(),
 finished_at timestamptz, dry_run boolean not null, counts jsonb not null default '{}', error text
);
create table private.retention_accounts (
 user_id uuid primary key, activity_at timestamptz not null, state text not null default 'notice_pending'
 check(state in ('notice_pending','notified','closing','closed','cancelled')),
 notice_sent_at timestamptz, close_after timestamptz, closed_at timestamptz,
 last_error text, attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 requested_by uuid, requested_at timestamptz
);
create table private.retention_evidence (
 scope text not null, target_id text not null, user_id uuid, listing_id uuid,
 snapshot jsonb not null, retention_until timestamptz not null, created_at timestamptz not null default now(),
 primary key(scope,target_id)
);
create table private.retention_storage_queue (
 id bigint generated always as identity primary key, bucket text not null, path text not null,
 listing_id uuid, user_id uuid, queued_at timestamptz not null default now(),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 deleted_at timestamptz, last_error text, unique(bucket,path)
);
-- Only records stored by Abracadeal can be purged by this database. External support mail stays external.
create table private.retention_support (
 id uuid primary key default gen_random_uuid(), user_id uuid, subject text not null,
 content text, closed_at timestamptz, created_at timestamptz not null default now()
);
do $$declare t text; begin
 foreach t in array array['retention_holds','retention_runs','retention_accounts','retention_evidence','retention_storage_queue','retention_support'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated',t);
 end loop;
end $$;
create index retention_storage_due on private.retention_storage_queue(next_attempt_at) where deleted_at is null;
create index retention_evidence_due on private.retention_evidence(retention_until);
alter table public.prospection_prospects add column last_inbound_contact_at timestamptz;
-- Sending an advertisement does not renew the prospect's retention clock.
do $$declare t text; begin
 foreach t in array array['reports','conversation_reports','vacation_review_reports'] loop
  execute format('alter table public.%I add column closed_at timestamptz',t);
  execute format('update public.%I set closed_at=now() where status in (''resolved'',''dismissed'',''closed'',''rejected'',''handled'')',t);
 end loop;
end $$;
create function private.retention_track_report_close() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status in ('resolved','dismissed','closed','rejected','handled') then
  if tg_op='INSERT' or old.status is distinct from new.status then new.closed_at:=now(); end if;
 else new.closed_at:=null; end if;
 return new;
end $$;
do $$declare t text; begin
 foreach t in array array['reports','conversation_reports','vacation_review_reports'] loop
  execute format('create trigger retention_report_close before insert or update of status on public.%I for each row execute function private.retention_track_report_close()',t);
 end loop;
end $$;
create function private.retention_held(s text,k text,u uuid default null,l uuid default null) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from private.retention_holds h where h.released_at is null and
  ((h.scope=s and h.target_id=k) or (h.scope='user' and h.target_id=u::text) or (h.scope='listing' and h.target_id=l::text)))
 or exists(select 1 from private.listing_archives a where a.listing_id=l and a.legal_hold);
$$;
create function private.retention_activity(u uuid) returns timestamptz language sql stable set search_path='' as $$
 select greatest(a.created_at,a.last_sign_in_at,p.updated_at,
  (select last_seen_at from public.user_presence where user_id=u),
  (select max(created_at) from public.messages where sender_id=u),
  (select max(updated_at) from public.listings where owner_id=u),
  (select max(updated_at) from public.commerce_orders where user_id=u),
  (select max(updated_at) from public.vacation_requests where traveler_id=u or host_id=u))
 from auth.users a left join public.profiles p on p.id=a.id where a.id=u;
$$;
create function private.retention_account_protected(u uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.profiles where id=u and is_admin)
 or exists(select 1 from public.internal_accounts where user_id=u)
 or private.retention_held('user',u::text,u)
 or exists(select 1 from public.pro_subscriptions where user_id=u and status not in ('canceled','cancelled','expired','inactive','unpaid'))
 or exists(select 1 from public.vacation_pro_subscriptions where user_id=u and status not in ('canceled','cancelled','expired','inactive','unpaid'))
 or exists(select 1 from public.vacation_hosts where user_id=u and subscription_status is not null and subscription_status not in ('canceled','cancelled','expired','inactive','unpaid'))
 or exists(select 1 from public.commerce_orders where user_id=u and status in ('pending','paid') and (status='pending' and updated_at>now()-interval '1 day' or revision_id is not null and exists(select 1 from private.listing_revisions where candidate_id=revision_id and applied_at is null and approved)))
 or exists(select 1 from public.listing_purchases where owner_id=u and status in ('paid','active') and (valid_until is null or valid_until>now()))
 or exists(select 1 from public.promotion_orders where owner_id=u and status in ('paid','active') and (expires_at is null or expires_at>now()))
 or exists(select 1 from public.listings where owner_id=u and greatest(featured_until,urgent_until)>now())
 or exists(select 1 from public.commerce_boost_wallet where user_id=u and available_credits>0)
 or exists(select 1 from public.pro_boost_wallet where user_id=u and available_credits>0)
 or exists(select 1 from public.pro_listing_credit_wallet where user_id=u and credits>0)
 or exists(select 1 from public.vacation_stays where (host_id=u or traveler_id=u) and ends_on>=current_date and status not in ('cancelled','canceled'))
 or exists(select 1 from public.vacation_requests where (host_id=u or traveler_id=u) and ends_on>=current_date and status not in ('cancelled','canceled','rejected'))
 or exists(select 1 from public.reports r join public.listings l on l.id=r.listing_id where l.owner_id=u and r.closed_at is null)
 or exists(select 1 from public.conversation_reports r join public.conversations c on c.id::text=r.conversation_id where (c.buyer_id=u or c.seller_id=u) and r.closed_at is null);
$$;
create function private.retention_queue_photo() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='DELETE') or (new.status='archived' and old.status is distinct from new.status) then
  insert into private.retention_storage_queue(bucket,path,listing_id,user_id)
  select coalesce(storage_bucket,'listing-images'),storage_path,old.id,old.owner_id
  from public.listing_photos where listing_id=old.id
  on conflict(bucket,path) do update set listing_id=excluded.listing_id,user_id=excluded.user_id,
   deleted_at=null,next_attempt_at=now(),last_error=null;
 end if;
 return coalesce(new,old);
end $$;
create trigger retention_queue_listing_photos before delete or update of status on public.listings
for each row execute function private.retention_queue_photo();
-- SQL is allowed to queue files, never to delete storage.objects metadata.
insert into private.retention_storage_queue(bucket,path,listing_id,user_id)
select coalesce(p.storage_bucket,'listing-images'),p.storage_path,l.id,l.owner_id
from public.listing_photos p join public.listings l on l.id=p.listing_id where l.status='archived'
on conflict(bucket,path) do nothing;

-- Expiring an archived listing must not recreate its five-year archive through the delete trigger.
do $$declare d text; begin
 select pg_get_functiondef('private.capture_listing_archive()'::regprocedure) into d;
 d:=replace(d,E'begin\n',E'begin\n  if tg_op = ''DELETE'' and current_setting(''abraca.retention_purge'',true)=txid_current()::text then return old; end if;\n');
 execute d;
 select pg_get_functiondef('public.abracadeal_enforce_profile_phone()'::regprocedure) into d;
 d:=replace(d,E'begin\n',E'begin\n  if tg_op=''UPDATE'' and new.phone is null and current_setting(''abraca.retention_close'',true)=old.id::text and exists(select 1 from private.retention_accounts where user_id=old.id and state=''closing'') then return new; end if;\n');
 execute d;
end $$;

create function private.retention_purge(p_dry_run boolean default true) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare n integer; result jsonb:='{}'; row record; ids uuid[]; rid bigint;
begin
 if not pg_try_advisory_xact_lock(hashtext('abracadeal-retention')) then return jsonb_build_object('busy',true); end if;
 if not p_dry_run then insert into private.retention_runs(dry_run) values(false) returning id into rid; end if;
 -- Entire conversations are expired by their last exchange, never message-by-message.
 select array_agg(c.id) into ids from public.conversations c where
 greatest(c.created_at,c.updated_at,(select max(created_at) from public.messages where conversation_id=c.id))<now()-interval '2 years'
 and not private.retention_held('conversation',c.id::text,c.buyer_id,c.listing_id)
 and not private.retention_held('conversation',c.id::text,c.seller_id,c.listing_id)
 and not exists(select 1 from public.conversation_reports r where r.conversation_id=c.id::text and r.closed_at is null)
 and not exists(select 1 from public.vacation_stays s where s.conversation_id=c.id and s.ends_on>=current_date);
 select count(*) into n from public.messages where conversation_id=any(ids);
 result:=result||jsonb_build_object('messages',n);
 if not p_dry_run then
  delete from public.messages where conversation_id=any(ids);
  delete from public.conversations c where c.id=any(ids)
   and not exists(select 1 from public.vacation_stays where conversation_id=c.id);
 end if;
 for row in select * from (values
  ('reports','id','closed_at','report','listing_id','reporter_id',interval '1 year'),
  ('conversation_reports','id','closed_at','report',null,'reporter_id',interval '1 year'),
  ('vacation_review_reports','id','closed_at','report',null,'reporter_id',interval '1 year'),
  ('prospection_prospects','id','greatest(created_at,last_inbound_contact_at)','prospect',null,null,interval '3 years'),
  ('pro_stock_sync_runs','id','coalesce(finished_at,started_at)','log',null,null,interval '1 year'),
  ('search_events','id','created_at','log',null,null,interval '1 year'),
  ('b2b_review_log','id','created_at','log',null,'user_id',interval '1 year')
 ) as t(tbl,keycol,clock,scope,listingcol,usercol,age) loop
  -- Table names and clock expressions above are internal constants, never user-provided SQL.
  execute format('select count(*) from public.%I where %s < now()-$1 and not private.retention_held($2,%I::text,%s,%s)',
   row.tbl,row.clock,row.keycol,coalesce(row.usercol,'null'),coalesce(row.listingcol,'null')) into n using row.age,row.scope;
  result:=result||jsonb_build_object(row.tbl,n);
  if not p_dry_run then execute format('delete from public.%I where %s < now()-$1 and not private.retention_held($2,%I::text,%s,%s)',
   row.tbl,row.clock,row.keycol,coalesce(row.usercol,'null'),coalesce(row.listingcol,'null')) using row.age,row.scope; end if;
 end loop;
 select count(*) into n from public.listing_moderation m join public.listings l on l.id=m.listing_id
 where l.status in ('rejected','archived') and coalesce(m.reviewed_at,l.archived_at,m.checked_at)<now()-interval '1 year'
 and not private.retention_held('listing',l.id::text,l.owner_id,l.id)
 and not exists(select 1 from public.reports r where r.listing_id=l.id and r.closed_at is null)
 and not (m.safety_blocked and m.enforcement_completed_at is null);
 result:=result||jsonb_build_object('listing_moderation',n);
 if not p_dry_run then delete from public.listing_moderation m using public.listings l
 where l.id=m.listing_id and l.status in ('rejected','archived') and coalesce(m.reviewed_at,l.archived_at,m.checked_at)<now()-interval '1 year'
 and not private.retention_held('listing',l.id::text,l.owner_id,l.id)
 and not exists(select 1 from public.reports r where r.listing_id=l.id and r.closed_at is null)
 and not (m.safety_blocked and m.enforcement_completed_at is null); end if;
 select count(*) into n from private.deleted_listing_signatures d where deleted_at<now()-interval '30 days' and not private.retention_held('listing',listing_id::text,owner_id,listing_id);
 result:=result||jsonb_build_object('deleted_signatures',n);
 result:=result||private.retention_expire_archives(p_dry_run);
 if not p_dry_run then
  delete from private.deleted_listing_signatures where deleted_at<now()-interval '30 days' and not private.retention_held('listing',listing_id::text,owner_id,listing_id);
  delete from private.phone_release_log where created_at<now()-interval '1 year' and not private.retention_held('user',previous_user_id::text,previous_user_id);
  delete from private.retention_support where closed_at<now()-interval '2 years' and not private.retention_held('support',id::text,user_id);
  delete from private.retention_evidence where retention_until<=now() and not private.retention_held(scope,target_id,user_id,listing_id);
  delete from private.retention_storage_queue where deleted_at<now()-interval '1 year';
  delete from private.retention_runs where finished_at<now()-interval '1 year';
  delete from cron.job_run_details where end_time<now()-interval '1 year';
  -- Stop notices when the user returns or a service / legal hold makes closure inappropriate.
  update private.retention_accounts set state='cancelled',notice_sent_at=null,close_after=null
   where state in ('notice_pending','notified') and (private.retention_activity(user_id)>activity_at or private.retention_account_protected(user_id));
  insert into private.retention_accounts(user_id,activity_at)
   select u.id,private.retention_activity(u.id) from auth.users u
   where private.retention_activity(u.id)<now()-interval '2 years' and not private.retention_account_protected(u.id)
   on conflict(user_id) do update set state='notice_pending',activity_at=excluded.activity_at,next_attempt_at=now(),last_error=null,attempts=0
   where private.retention_accounts.state='cancelled' and private.retention_accounts.activity_at<excluded.activity_at;
  update private.retention_runs set finished_at=now(),counts=result where id=rid;
 end if;
 return result;
end $$;

create function private.retention_expire_archives(p_dry_run boolean) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r record; t record; n integer:=0; expired uuid[]; cutoff timestamptz; begin
 select array_agg(l.id) into expired from public.listings l
 where l.status='archived' and coalesce(l.retention_until,l.archived_at+interval '5 years')<=now()
 and not private.retention_held('listing',l.id::text,l.owner_id,l.id)
 and not exists(select 1 from public.conversations c where c.listing_id=l.id and
  (private.retention_held('conversation',c.id::text,c.buyer_id,l.id) or private.retention_held('conversation',c.id::text,c.seller_id,l.id)
  or greatest(c.updated_at,(select max(created_at) from public.messages where conversation_id=c.id))>now()-interval '2 years'))
 and not exists(select 1 from public.reports where listing_id=l.id and closed_at is null)
 and not exists(select 1 from public.vacation_stays where listing_id=l.id and ends_on>=current_date)
 and not exists(select 1 from public.commerce_orders where listing_id=l.id and status='pending' and updated_at>now()-interval '1 day');
 n:=coalesce(array_length(expired,1),0);
 if not p_dry_run then
  -- Preserve order proof before legacy ON DELETE CASCADE constraints delete linked rows.
  for r in select id,owner_id from public.listings where id=any(expired) loop
   for t in select * from (values ('listing_purchases','id','owner_id'),('vacation_subscription_orders','id','user_id')) v(tbl,keycol,ownercol) loop
    execute format('insert into private.retention_evidence(scope,target_id,user_id,listing_id,snapshot,retention_until)
     select $1,%I::text,%I,listing_id,to_jsonb(x),date_trunc(''year'',greatest(created_at,coalesce((to_jsonb(x)->>''paid_at'')::timestamptz,(to_jsonb(x)->>''completed_at'')::timestamptz,created_at)))+interval ''11 years''
     from public.%I x where listing_id=$2 on conflict(scope,target_id) do nothing',t.keycol,t.ownercol,t.tbl)
     using t.tbl,r.id;
   end loop;
  end loop;
  perform set_config('abraca.retention_purge',txid_current()::text,true);
  perform set_config('abraca.revision_write',txid_current()::text,true);
  delete from private.listing_revisions where candidate_id=any(expired) or original_id=any(expired);
  delete from public.listings where id=any(expired);
  -- The old archive job alone did not remove the duplicate archived rows in public.listings.
  delete from private.listing_archives where retention_until<=now() and not legal_hold
   and not private.retention_held('listing',listing_id::text,owner_id,listing_id)
   and not exists(select 1 from public.listings l where l.id=listing_id);
  -- Financial rows are kept through the conservative year-end accounting deadline.
  for r in select user_id,closed_at from private.retention_accounts where state='closed'
   and closed_at+interval '5 years'<=now() and not private.retention_held('user',user_id::text,user_id) loop
   cutoff:=date_trunc('year',r.closed_at)+interval '11 years';
   if cutoff>now() then
    update public.commerce_orders set withdrawal_text=null,withdrawal_accepted_at=null where user_id=r.user_id and amount_cents<12000;
    update public.promotion_orders set withdrawal_text=null,withdrawal_accepted_at=null where owner_id=r.user_id and amount_cents<12000;
   else
    delete from public.commerce_orders where user_id=r.user_id and not private.retention_held('order',id::text,r.user_id,listing_id);
    delete from public.promotion_orders where owner_id=r.user_id and not private.retention_held('order',id::text,r.user_id);
    delete from public.pro_subscription_orders where user_id=r.user_id and not private.retention_held('order',id::text,r.user_id);
    delete from public.vacation_pro_orders where user_id=r.user_id and not private.retention_held('order',id::text,r.user_id);
   end if;
  end loop;
 end if;
 return jsonb_build_object('expired_listings',n);
end $$;

create table private.retention_worker_lock (
 id boolean primary key default true check(id),token uuid,lease_until timestamptz not null default '-infinity'
);
alter table private.retention_worker_lock enable row level security;
revoke all on private.retention_worker_lock from public,anon,authenticated;
insert into private.retention_worker_lock(id) values(true);
create function public.retention_claim_worker(p_token uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform private.retention_require_service();
 update private.retention_worker_lock set token=p_token,lease_until=now()+interval '5 minutes' where id and lease_until<=now();
 return found;
end $$;
create function public.retention_release_worker(p_token uuid,p_counts jsonb,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.retention_require_service();
 update private.retention_worker_lock set lease_until='-infinity',token=null where token=p_token;
 if found then insert into private.retention_runs(dry_run,finished_at,counts,error) values(false,now(),p_counts,left(p_error,500)); end if;
end $$;

-- Service-role wrappers are the only API surface used by the authenticated cron worker.
create function private.retention_require_service() returns void language plpgsql set search_path='' as $$
begin if current_setting('role',true)<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if; end $$;
create function public.retention_worker_tasks() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.retention_require_service();
 return jsonb_build_object('accounts',coalesce((select jsonb_agg(to_jsonb(q)) from
  (select user_id,state,notice_sent_at,close_after from private.retention_accounts where
   next_attempt_at<=now() and (state='notice_pending' or state='closing' or state='notified' and close_after<=now()) order by next_attempt_at limit 10) q),'[]'),
 'storage',coalesce((select jsonb_agg(to_jsonb(q)) from
  (select id,bucket,path from private.retention_storage_queue where deleted_at is null and next_attempt_at<=now() order by id limit 100) q),'[]'));
end $$;
create function public.retention_storage_allowed(p_id bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare q private.retention_storage_queue%rowtype; begin
 perform private.retention_require_service(); select * into q from private.retention_storage_queue where id=p_id for update;
 if not found or q.deleted_at is not null then return false; end if;
 if private.retention_held('listing',q.listing_id::text,q.user_id,q.listing_id)
 or exists(select 1 from public.listing_photos p join public.listings l on l.id=p.listing_id
  where p.storage_path=q.path and coalesce(p.storage_bucket,'listing-images')=q.bucket and l.status<>'archived')
 or exists(select 1 from public.pro_showrooms where banner_path=q.path or logo_path=q.path)
 or exists(select 1 from public.b2b_requests where document_path=q.path) then
  update private.retention_storage_queue set next_attempt_at=now()+interval '1 day',last_error='Fichier encore référencé ou gelé' where id=p_id; return false;
 end if;
 return true;
end $$;
create function public.retention_storage_result(p_id bigint,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.retention_require_service();
 update private.retention_storage_queue set deleted_at=case when p_error is null then now() else null end,
  attempts=attempts+1,last_error=left(p_error,500),next_attempt_at=now()+interval '1 hour' where id=p_id;
 if p_error is null then
  delete from public.listing_photos p using private.retention_storage_queue q,public.listings l
   where q.id=p_id and p.storage_path=q.path and coalesce(p.storage_bucket,'listing-images')=q.bucket and l.id=p.listing_id and l.status='archived';
 end if;
end $$;
create function public.retention_notice_result(p_user uuid,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.retention_require_service();
 update private.retention_accounts set state=case when p_error is null then 'notified' else state end,
  notice_sent_at=case when p_error is null then now() else null end,close_after=case when p_error is null then now()+interval '30 days' else null end,
  last_error=left(p_error,500),attempts=attempts+1,next_attempt_at=now()+interval '1 day'
 where user_id=p_user and state='notice_pending';
end $$;
create function public.retention_begin_close(p_user uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare q private.retention_accounts%rowtype; begin
 perform private.retention_require_service(); select * into q from private.retention_accounts where user_id=p_user for update;
 if not found or q.state not in ('notified','closing') then return false; end if;
 if q.state='notified' and (q.notice_sent_at is null or q.close_after>now() or private.retention_activity(p_user)>q.activity_at or private.retention_account_protected(p_user)) then
  update private.retention_accounts set state='cancelled' where user_id=p_user; return false;
 end if;
 if q.state='notified' then
  insert into private.retention_evidence(scope,target_id,user_id,snapshot,retention_until)
  select 'user',p_user::text,p_user,jsonb_build_object('email',u.email,'phone',u.phone,'metadata',u.raw_user_meta_data,
   'profile',(select to_jsonb(p) from public.profiles p where id=p_user),
   'company',(select to_jsonb(p) from public.pro_verifications p where user_id=p_user),
   'vacation',(select to_jsonb(p) from public.vacation_user_details p where user_id=p_user)),now()+interval '5 years'
  from auth.users u where u.id=p_user on conflict(scope,target_id) do nothing;
  update private.retention_accounts set state='closing' where user_id=p_user;
 end if;
 delete from auth.sessions where user_id=p_user;
 delete from auth.refresh_tokens where user_id=p_user::text;
 return true;
end $$;
create function public.retention_finish_close(p_user uuid,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
declare r record; begin
 perform private.retention_require_service();
 perform 1 from private.retention_accounts where user_id=p_user and state='closing' for update;
 if not found then raise exception 'Closure was not prepared'; end if;
 if p_error is not null then update private.retention_accounts set last_error=left(p_error,500),next_attempt_at=now()+interval '1 hour' where user_id=p_user; return; end if;
 perform set_config('abraca.revision_write',txid_current()::text,true);
 perform set_config('abraca.retention_close',p_user::text,true);
 update public.listings set status='archived',archived_at=coalesce(archived_at,now()),archive_reason=coalesce(archive_reason,'other'),retention_until=coalesce(retention_until,now()+interval '5 years') where owner_id=p_user and status<>'archived';
 -- Keep the UUID as a pseudonymous FK anchor. Deleting auth.users would cascade paid orders and other participants' messages.
 update public.profiles set display_name='Compte fermé',phone=null,city=null where id=p_user;
 update public.listings set phone=null,contact_email=null where owner_id=p_user;
 delete from public.listing_contacts where owner_id=p_user;
 delete from public.phone_registry where user_id=p_user;
 delete from public.vacation_user_details where user_id=p_user;
 delete from public.pro_verifications where user_id=p_user;
 delete from public.favorites where user_id=p_user;
 delete from public.saved_alerts where user_id=p_user;
 delete from public.user_presence where user_id=p_user;
 delete from public.pro_followers where follower_id=p_user or pro_id=p_user;
 update public.reviews set status='hidden',comment='Compte fermé',seller_reply=null,reviewer_name='Compte fermé',reviewer_city='' where seller_id=p_user or reviewer_id=p_user;
 update public.vacation_reviews set status='hidden',comment='Compte fermé',subject_reply=null where subject_id=p_user or reviewer_id=p_user;
 update public.pro_stock_feeds set active=false,feed_url=null where owner_id=p_user;
 delete from public.vacation_ical_feeds where owner_id=p_user;
 for r in select bucket_id,name from storage.objects where coalesce(owner_id,owner::text)=p_user::text and bucket_id in ('listing-images','listing-images-pending','pro-showroom','b2b-documents','b2b-images') loop
  insert into private.retention_storage_queue(bucket,path,user_id) values(r.bucket_id,r.name,p_user)
   on conflict(bucket,path) do update set deleted_at=null,next_attempt_at=now();
 end loop;
 delete from public.pro_showrooms where user_id=p_user;
 delete from public.b2b_requests where user_id=p_user;
 update public.b2b_offers set status='archived',contact_phone='',contact_email='',company_name='Compte fermé' where seller_id=p_user;
 update private.retention_accounts set state='closed',closed_at=now(),last_error=null where user_id=p_user;
end $$;

create function public.admin_retention_status() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 return jsonb_build_object('preview',private.retention_purge(true),
  'runs',coalesce((select jsonb_agg(to_jsonb(t)) from (select * from private.retention_runs order by id desc limit 10)t),'[]'),
  'holds',coalesce((select jsonb_agg(to_jsonb(t)) from (select * from private.retention_holds where released_at is null order by review_at)t),'[]'),
  'accounts',coalesce((select jsonb_agg(to_jsonb(t)) from (select user_id,state,notice_sent_at,close_after,closed_at,last_error from private.retention_accounts order by user_id limit 100)t),'[]'),
  'storage_pending',(select count(*) from private.retention_storage_queue where deleted_at is null),
  'storage_errors',coalesce((select jsonb_agg(to_jsonb(t)) from (select id,listing_id,last_error from private.retention_storage_queue where deleted_at is null and last_error is not null limit 20)t),'[]'));
end $$;
create function public.admin_retention_hold(p_scope text,p_target text,p_reason text,p_release boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 if p_release then update private.retention_holds set released_at=now() where scope=p_scope and target_id=p_target;
 else insert into private.retention_holds(scope,target_id,reason,created_by) values(p_scope,p_target,p_reason,auth.uid())
  on conflict(scope,target_id) do update set reason=excluded.reason,created_by=excluded.created_by,created_at=now(),review_at=now()+interval '6 months',released_at=null; end if;
end $$;
-- New functions default to PUBLIC execute: revoke all internal helpers explicitly.
do $$declare p record; begin
 for p in select oid::regprocedure as signature from pg_proc where pronamespace='private'::regnamespace and proname like 'retention_%' loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',p.signature);
 end loop;
 for p in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'retention_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',p.signature);
  execute format('grant execute on function %s to service_role',p.signature);
 end loop;
end $$;
revoke all on function public.admin_retention_status(),public.admin_retention_hold(text,text,text,boolean) from public,anon;
grant execute on function public.admin_retention_status(),public.admin_retention_hold(text,text,text,boolean) to authenticated;

insert into public.integration_secrets(name,secret_value) values('retention_cron',encode(extensions.gen_random_bytes(32),'hex')) on conflict(name) do nothing;
create function private.dispatch_retention_worker() returns bigint language plpgsql security invoker set search_path='' as $$
declare k text; u text; r bigint; begin
 select secret_value into k from public.integration_secrets where name='retention_cron';
 select decrypted_secret into u from vault.decrypted_secrets where name='abracadeal_project_url';
 if nullif(k,'') is null or nullif(u,'') is null then raise exception 'Retention worker configuration missing'; end if;
 r:=net.http_post(url:=rtrim(u,'/')||'/functions/v1/process-data-retention',
  headers:=jsonb_build_object('Content-Type','application/json','x-retention-key',k),body:='{}'::jsonb,timeout_milliseconds:=120000);
 return r;
end $$;
revoke all on function private.dispatch_retention_worker() from public,anon,authenticated,service_role;
