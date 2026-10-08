create or replace function private.retention_track_report_close() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status in ('reviewed','resolved','dismissed','closed','rejected','handled') then
  if tg_op='INSERT' or old.status is distinct from new.status then new.closed_at:=now(); end if;
 else new.closed_at:=null; end if;
 return new;
end $$;

create or replace function private.retention_account_protected(u uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.profiles where id=u and is_admin)
 or exists(select 1 from public.internal_accounts where user_id=u)
 or private.retention_held('user',u::text,u)
 or exists(select 1 from public.pro_subscriptions where user_id=u and status not in ('canceled','cancelled','expired','inactive','unpaid'))
 or exists(select 1 from public.vacation_pro_subscriptions where user_id=u and status not in ('canceled','cancelled','expired','inactive','unpaid'))
 or exists(select 1 from public.vacation_hosts where user_id=u and subscription_status is not null and subscription_status not in ('canceled','cancelled','expired','inactive','unpaid'))
 or exists(select 1 from public.commerce_orders where user_id=u and status in ('pending','paid') and (status='pending' and updated_at>now()-interval '1 day' or revision_id is not null and exists(select 1 from private.listing_revisions where candidate_id=revision_id and applied_at is null and approved)))
 or exists(select 1 from public.pro_subscription_orders where user_id=u and status='pending' and updated_at>now()-interval '1 day')
 or exists(select 1 from public.vacation_pro_orders where user_id=u and status='pending' and updated_at>now()-interval '1 day')
 or exists(select 1 from public.vacation_subscription_orders where user_id=u and status='pending' and updated_at>now()-interval '1 day')
 or exists(select 1 from public.promotion_orders where owner_id=u and status='pending' and created_at>now()-interval '1 day')
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

create or replace function public.retention_finish_close(p_user uuid,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
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
 update public.b2b_offers set status='archived',contact_phone='FERME00',contact_email='closed@accounts.invalid',company_name='Compte fermé' where seller_id=p_user;
 update private.retention_accounts set state='closed',closed_at=now(),last_error=null where user_id=p_user;
end $$;

create or replace function private.retention_expire_archives(p_dry_run boolean) returns jsonb language plpgsql security invoker set search_path='' as $$
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
    delete from public.pro_subscriptions where user_id=r.user_id;
    delete from public.vacation_pro_subscriptions where user_id=r.user_id;
    delete from public.founder_enrollments where user_id=r.user_id;
    delete from public.vacation_hosts where user_id=r.user_id;
   end if;
  end loop;
 end if;
 return jsonb_build_object('expired_listings',n);
end $$;

update public.reports set closed_at=now() where status='reviewed' and closed_at is null;
update public.conversation_reports set closed_at=now() where status='reviewed' and closed_at is null;
