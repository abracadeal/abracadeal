create or replace function private.guard_photo_bucket()
returns trigger language plpgsql set search_path='' as $$
declare v_owner uuid;
begin
 if coalesce(auth.jwt()->>'role','')='service_role' then return new; end if;
 if tg_op='INSERT' or new.storage_path is distinct from old.storage_path or new.listing_id is distinct from old.listing_id then
  if new.storage_path !~ '^https://' then
   select owner_id into strict v_owner from public.listings where id=new.listing_id;
   if new.storage_bucket<>'listing-images-pending' or split_part(new.storage_path,'/',1)<>v_owner::text or split_part(new.storage_path,'/',2)<>new.listing_id::text then raise exception 'Photo privée appartenant à cette annonce requise'; end if;
  elsif new.storage_bucket<>'listing-images' then raise exception 'Bucket externe invalide'; end if;
 elsif new.storage_bucket is distinct from old.storage_bucket then raise exception 'Publication des photos réservée au service'; end if;
 return new;
end; $$;
