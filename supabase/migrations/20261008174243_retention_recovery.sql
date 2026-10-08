create or replace function public.retention_storage_allowed(p_id bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare q private.retention_storage_queue%rowtype; begin
 perform private.retention_require_service(); select * into q from private.retention_storage_queue where id=p_id for update;
 if not found or q.deleted_at is not null then return false; end if;
 if private.retention_held('listing',q.listing_id::text,q.user_id,q.listing_id)
 or exists(select 1 from public.listing_photos p join public.listings l on l.id=p.listing_id where p.storage_path=q.path and coalesce(p.storage_bucket,'listing-images')=q.bucket and private.retention_held('listing',l.id::text,l.owner_id,l.id))
 or exists(select 1 from public.listing_photos p join public.listings l on l.id=p.listing_id
  where p.storage_path=q.path and coalesce(p.storage_bucket,'listing-images')=q.bucket and l.status<>'archived')
 or exists(select 1 from public.pro_showrooms where banner_path=q.path or logo_path=q.path)
 or exists(select 1 from public.b2b_requests where document_path=q.path) then
  update private.retention_storage_queue set next_attempt_at=now()+interval '1 day',last_error='Fichier encore référencé ou gelé' where id=p_id; return false;
 end if;
 return true;
end $$;

create or replace function public.retention_storage_quarantine(p_id bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare q private.retention_storage_queue%rowtype; begin
 perform private.retention_require_service();select * into q from private.retention_storage_queue where id=p_id;
 if not found or q.deleted_at is not null or q.bucket<>'listing-images'
 or not (private.retention_held('listing',q.listing_id::text,q.user_id,q.listing_id) or exists(select 1 from public.listing_photos p join public.listings l on l.id=p.listing_id where p.storage_path=q.path and coalesce(p.storage_bucket,'listing-images')=q.bucket and private.retention_held('listing',l.id::text,l.owner_id,l.id)))
 or exists(select 1 from public.listing_photos p join public.listings l on l.id=p.listing_id
  where p.storage_path=q.path and coalesce(p.storage_bucket,'listing-images')=q.bucket and l.status<>'archived') then return null; end if;
 return jsonb_build_object('bucket','listing-images-pending','path','retention-evidence/'||q.id::text||'/'||regexp_replace(q.path,'^.*/',''));
end $$;

create or replace function public.retention_storage_quarantined(p_id bigint) returns void language plpgsql security definer set search_path='' as $$
declare q private.retention_storage_queue%rowtype; plan jsonb; begin
 perform private.retention_require_service();
 select * into q from private.retention_storage_queue where id=p_id for update;
 if not found or q.deleted_at is not null then return; end if;
 if q.bucket<>'listing-images' then raise exception 'Public source required'; end if;
 -- Record the protected copy even if the legal hold was released during Storage I/O.
 plan:=jsonb_build_object('bucket','listing-images-pending','path','retention-evidence/'||q.id::text||'/'||regexp_replace(q.path,'^.*/',''));
 perform set_config('abraca.revision_write',txid_current()::text,true);
 update public.listing_photos set storage_bucket=plan->>'bucket',storage_path=plan->>'path'
 where storage_path=q.path and coalesce(storage_bucket,'listing-images')=q.bucket;
 insert into private.retention_storage_queue(bucket,path,listing_id,user_id,next_attempt_at)
 values(plan->>'bucket',plan->>'path',q.listing_id,q.user_id,now()+interval '1 day')
 on conflict(bucket,path) do update set deleted_at=null,next_attempt_at=excluded.next_attempt_at;
 update private.retention_storage_queue set deleted_at=now(),last_error=null where id=p_id;
end $$;
