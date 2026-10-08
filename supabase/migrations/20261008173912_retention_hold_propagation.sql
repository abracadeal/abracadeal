create or replace function private.retention_held(s text,k text,u uuid default null,l uuid default null) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from private.retention_holds h where h.released_at is null and
  ((h.scope=s and h.target_id=k) or (h.scope='user' and h.target_id=u::text) or (h.scope='listing' and h.target_id=l::text)
   or (h.scope='order' and h.target_id=k and s in ('listing_purchases','vacation_subscription_orders','commerce_orders','promotion_orders'))))
 or exists(select 1 from private.listing_archives a where a.listing_id=l and a.legal_hold);
$$;
create function public.retention_storage_quarantine(p_id bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare q private.retention_storage_queue%rowtype; begin
 perform private.retention_require_service();select * into q from private.retention_storage_queue where id=p_id;
 if not found or q.deleted_at is not null or q.bucket<>'listing-images'
 or not private.retention_held('listing',q.listing_id::text,q.user_id,q.listing_id)
 or exists(select 1 from public.listing_photos p join public.listings l on l.id=p.listing_id
  where p.storage_path=q.path and coalesce(p.storage_bucket,'listing-images')=q.bucket and l.status<>'archived') then return null; end if;
 return jsonb_build_object('bucket','listing-images-pending','path','retention-evidence/'||q.id::text||'/'||regexp_replace(q.path,'^.*/',''));
end $$;
create function public.retention_storage_quarantined(p_id bigint) returns void language plpgsql security definer set search_path='' as $$
declare q private.retention_storage_queue%rowtype; plan jsonb; begin
 perform private.retention_require_service();plan:=public.retention_storage_quarantine(p_id);
 if plan is null then raise exception 'Quarantine is no longer permitted'; end if;
 select * into q from private.retention_storage_queue where id=p_id for update;
 perform set_config('abraca.revision_write',txid_current()::text,true);
 update public.listing_photos set storage_bucket=plan->>'bucket',storage_path=plan->>'path'
 where storage_path=q.path and coalesce(storage_bucket,'listing-images')=q.bucket;
 insert into private.retention_storage_queue(bucket,path,listing_id,user_id,next_attempt_at)
 values(plan->>'bucket',plan->>'path',q.listing_id,q.user_id,now()+interval '1 day')
 on conflict(bucket,path) do update set deleted_at=null,next_attempt_at=excluded.next_attempt_at;
 update private.retention_storage_queue set deleted_at=now(),last_error=null where id=p_id;
end $$;
revoke all on function public.retention_storage_quarantine(bigint),public.retention_storage_quarantined(bigint) from public,anon,authenticated;
grant execute on function public.retention_storage_quarantine(bigint),public.retention_storage_quarantined(bigint) to service_role;
-- Preserve a review held for litigation before anonymizing the public profile.
do $$declare d text; begin
 select pg_get_functiondef('public.retention_finish_close(uuid,text)'::regprocedure) into d;
 d:=replace(d,' update public.reviews set status=',E' insert into private.retention_evidence(scope,target_id,user_id,snapshot,retention_until)\n select ''review'',id::text,p_user,to_jsonb(v),now()+interval ''1 year'' from public.reviews v where (seller_id=p_user or reviewer_id=p_user) and private.retention_held(''review'',id::text,p_user) on conflict(scope,target_id) do nothing;\n update public.reviews set status=');
 execute d;
 select pg_get_functiondef('private.retention_additional_purge(boolean)'::regprocedure) into d;
 d:=replace(d,' return jsonb_build_object(',E' if not p_dry_run then delete from private.retention_hold_audit where changed_at<now()-interval ''1 year'' and not private.retention_held(scope,target_id); end if;\n return jsonb_build_object(');
 execute d;
end $$;
