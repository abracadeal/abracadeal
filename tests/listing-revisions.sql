-- Transactional integration tests: no real listing, order or queued call survives.
begin;
do $$
declare v_expiry timestamptz; owner uuid; v_id uuid; candidate uuid; orderid uuid; proposal jsonb; old_date timestamptz:=now()-interval '1 day'; old_feature timestamptz:=now()+interval '7 days'; photo_id uuid; hash_value text:=repeat('a',64); original_title text:='Fauteuil de salon test révisions';
begin
 select p.id into strict owner from public.profiles p where not coalesce(is_admin,false) and private.moderation_user_allowed(p.id) limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','service_role')::text,true);
 insert into public.listings(owner_id,category,title,description,price,city,status,created_at,featured_until,urgent_until)
 values(owner,'autres',original_title,'Fauteuil de salon disponible en bon état.',100,'Cannes','pending',old_date,old_feature,old_feature) returning listings.id into v_id;
 insert into public.listing_moderation(listing_id,ai_checked,risk_level,risk_score,safety_snapshot) values(v_id,true,'green',0,jsonb_build_object('text',original_title||E'\n'||'Fauteuil de salon disponible en bon état.','photos','[]'::jsonb));
 update public.listings set status='active' where listings.id=v_id;
 if (select status from public.listings where listings.id=v_id)<>'active' then raise exception 'Fixture non active'; end if;
 if (select expires_at from public.listings where id=v_id) is distinct from now()+interval '60 days' then raise exception 'FAIL first publication sixty days'; end if;
 perform set_config('abraca.expiry_backfill',txid_current()::text,true);
 update public.listings set expires_at=now()+interval '20 days' where id=v_id;
 perform set_config('abraca.expiry_backfill','',true);
 select expires_at into v_expiry from public.listings where id=v_id;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 proposal:=public.prepare_listing_change(v_id,'{"price":90}',false,null);
 if proposal->>'price_only'<>'true' or (select price from public.listings where listings.id=v_id)<>90 or (select created_at from public.listings where listings.id=v_id)<>old_date or (select status from public.listings where listings.id=v_id)<>'active' then raise exception 'FAIL prix gratuit sans remontée';end if;
 if (select expires_at from public.listings where id=v_id) is distinct from v_expiry then raise exception 'FAIL price decrease extended expiry'; end if;
 update public.listings set expires_at=now()+interval '1 year' where id=v_id;
 if (select expires_at from public.listings where id=v_id) is distinct from v_expiry then raise exception 'FAIL owner bypassed expiry'; end if;
 proposal:=public.prepare_listing_change(v_id,'{"title":"Fauteuil de salon retapissé"}',false,null);candidate:=(proposal->>'listing_id')::uuid;
 if (select title from public.listings where listings.id=v_id)<>original_title then raise exception 'Ancienne version remplacée trop tôt';end if;
 if (select expires_at from public.listings where id=candidate) is not null then raise exception 'FAIL candidate expires during review'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','service_role')::text,true);
 insert into public.listing_moderation(listing_id,ai_checked,risk_level,risk_score,safety_snapshot) select candidate,true,'green',0,jsonb_build_object('text',title||E'\n'||description,'photos','[]'::jsonb) from public.listings where listings.id=candidate;
 perform public.complete_listing_revision(candidate,true,null);
 if (select title from public.listings where listings.id=v_id)<>original_title then raise exception 'Remplacement avant paiement';end if;
 insert into public.commerce_orders(user_id,offer_code,amount_cents,status,listing_id,revision_id,withdrawal_accepted_at,withdrawal_text) values(owner,'private_listing_edit',290,'paid',v_id,candidate,now(),'Consentement de test') returning commerce_orders.id into orderid;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 begin delete from public.listings where listings.id=candidate;raise exception 'FAIL suppression directe d’une proposition payée';exception when others then if sqlerrm<>'Annulez cette proposition depuis Options de mes annonces.' then raise;end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','service_role')::text,true);
 perform public.complete_listing_revision(candidate,false,orderid);
 if (select title from public.listings where listings.id=v_id)<>'Fauteuil de salon retapissé' or (select created_at from public.listings where listings.id=v_id)<=old_date or (select featured_until from public.listings where listings.id=v_id)<>old_feature or (select urgent_until from public.listings where listings.id=v_id)<>old_feature then raise exception 'FAIL modification payée remontée/options';end if;
 perform public.complete_listing_revision(candidate,false,orderid);
 if (select expires_at from public.listings where id=v_id) is distinct from now()+interval '60 days' then raise exception 'FAIL paid approved edit did not renew sixty days'; end if;
 select expires_at into v_expiry from public.listings where id=v_id;
 -- raise notice 'PASS modification payée validée avec remontée, options préservées, webhook idempotent';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 proposal:=public.prepare_listing_change(v_id,'{"title":"Accompagnement interdit"}',false,null);candidate:=(proposal->>'listing_id')::uuid;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','service_role')::text,true);
 update public.listings set status='rejected' where listings.id=candidate;
 insert into public.commerce_orders(user_id,offer_code,amount_cents,status,listing_id,revision_id,withdrawal_accepted_at,withdrawal_text) values(owner,'private_listing_edit',290,'paid',v_id,candidate,now(),'Consentement de test') returning commerce_orders.id into orderid;
 proposal:=public.complete_listing_revision(candidate,false,orderid);
 if proposal->>'refused'<>'true' then raise exception 'FAIL paiement après refus';end if;
 if (select status from public.listings where listings.id=v_id)<>'active' or (select title from public.listings where listings.id=v_id)<>'Fauteuil de salon retapissé' or (select featured_until from public.listings where listings.id=v_id)<>old_feature then raise exception 'FAIL refus conserve ancienne annonce/options';end if;
 if (select expires_at from public.listings where id=v_id) is distinct from v_expiry then raise exception 'FAIL rejected edit changed expiry'; end if;
 perform set_config('abraca.revision_write','',true);
 delete from public.listings where listings.id=v_id;
 begin
  insert into public.listings(owner_id,category,title,description,price,city,status) values(owner,'autres','Fauteuil de salon retapissé','Test de republication',90,'Cannes','pending');
  raise exception 'FAIL republication acceptée';
 exception when others then
  if sqlerrm<> 'Cette annonce ressemble à une annonce supprimée récemment. Modifiez-la depuis Mes annonces.' then raise; end if;
 end;
 -- raise notice 'PASS republication par titre bloquée après suppression';
 -- The ordinary owner cannot evade the paid path through direct API writes.
 perform set_config('abraca.revision_write','',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 -- Insert a fresh pending fixture, then approve as the service.
 insert into public.listings(owner_id,category,title,description,price,city,status,created_at) values(owner,'autres','Bureau contemporain vérification','Bureau en bon état à retirer',100,'Cannes','pending',old_date) returning listings.id into v_id;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','service_role')::text,true);
 insert into public.listing_moderation(listing_id,ai_checked,risk_level,risk_score,safety_snapshot) select v_id,true,'green',0,jsonb_build_object('text',title||E'\n'||description,'photos','[]'::jsonb) from public.listings where listings.id=v_id;
 update public.listings set status='active' where listings.id=v_id;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 begin
  update public.listings set title='Bureau modifié gratuitement' where listings.id=v_id;
  raise exception 'FAIL édition directe autorisée';
 exception when others then if sqlerrm<>'Utilisez Modifier et remonter mon annonce' then raise; end if;end;
 begin
  update public.listings set price=90,featured_until=now()+interval '100 days' where listings.id=v_id;
  raise exception 'FAIL baisse et option gratuite autorisées';
 exception when others then if sqlerrm not in ('Champ réservé au service','Les mises en avant sont gerees exclusivement par Abracadeal') then raise; end if;end;
 update public.listings set price=90 where listings.id=v_id;
 if (select created_at from public.listings where listings.id=v_id)<>old_date or (select status from public.listings where listings.id=v_id)<>'active' then raise exception 'FAIL baisse directe sans remontée';end if;
 begin
  insert into public.listing_photos(listing_id,storage_path,storage_bucket) values(v_id,owner::text||'/'||v_id::text||'/test.webp','listing-images-pending');
  raise exception 'FAIL ajout photo direct accepté';
 exception when others then if sqlerrm<>'Utilisez Modifier et remonter mon annonce pour modifier les photos' then raise; end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','service_role')::text,true);
 -- The exact photo digest survives cascading deletion and catches a changed title.
 insert into public.listings(owner_id,category,title,description,price,city,status) values(owner,'autres','Bibliothèque ancienne en chêne','Meuble ancien disponible',60,'Cannes','pending') returning listings.id into v_id;
 insert into public.listing_photos(listing_id,storage_path,storage_bucket) values(v_id,owner::text||'/'||v_id::text||'/test.webp','listing-images-pending') returning listing_photos.id into photo_id;
 insert into private.listing_photo_hashes(photo_id,listing_id,owner_id,sha256) select p.id,p.listing_id,owner,hash_value from public.listing_photos p where p.id=photo_id;
 delete from public.listings where listings.id=v_id;
 insert into public.listings(owner_id,category,title,description,price,city,status) values(owner,'autres','Objet de décoration vintage','Objet disponible à retirer',60,'Cannes','pending') returning listings.id into candidate;
 insert into public.listing_photos(listing_id,storage_path,storage_bucket) values(candidate,owner::text||'/'||candidate::text||'/test.webp','listing-images-pending') returning listing_photos.id into photo_id;
 insert into private.listing_photo_hashes(photo_id,listing_id,owner_id,sha256) select p.id,p.listing_id,owner,hash_value from public.listing_photos p where p.id=photo_id;
 if not public.check_listing_republication(candidate) then raise exception 'FAIL republication par empreinte acceptée'; end if;
 update private.deleted_listing_signatures set deleted_at=now()-interval '31 days' where listing_id=v_id;
 if public.check_listing_republication(candidate) then raise exception 'FAIL délai 30 jours'; end if;
end $$;
set constraints all immediate;
rollback;
