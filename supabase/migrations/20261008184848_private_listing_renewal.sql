-- Free renewal preserves listing reference, content, options and result position.
do $$declare d text;begin
 select pg_get_functiondef('private.set_private_listing_expiry()'::regprocedure) into d;
 d:=replace(d,' if new.seller_type<>''particulier'' or new.category=''vacances'' then return new; end if;',
 $replacement$ if new.seller_type<>'particulier' or new.category='vacances' then return new; end if;
 if tg_op='UPDATE' and current_setting('abraca.renewal_write',true)=txid_current()::text then
  if new.status='active' then new.expires_at:=greatest(old.expires_at,now())+interval '60 days';
  else new.expires_at:=null; end if;
  new.expiry_reminder_sent_at:=null;return new;
 end if;$replacement$);
 execute d;
end $$;
create function public.renew_private_listing(p_listing_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare l public.listings%rowtype;v_status text;v_expires timestamptz;old_marker text:=current_setting('abraca.renewal_write',true);
begin
 if auth.uid() is null or not private.moderation_user_allowed(auth.uid()) then raise exception 'Compte indisponible'; end if;
 select * into l from public.listings where id=p_listing_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Annonce introuvable'; end if;
 if l.seller_type<>'particulier' or l.category='vacances' or l.revision_of is not null then raise exception 'Prolongation non disponible pour cette annonce'; end if;
 if not (l.status='active' or (l.status='archived' and l.archive_reason='expired')) then raise exception 'Cette annonce ne peut pas être prolongée'; end if;
 if l.expires_at is null or l.expires_at>now()+interval '7 days' then raise exception 'La prolongation sera disponible dans les 7 derniers jours'; end if;
 v_status:=case when l.status='active' and l.expires_at>now() then 'active' else 'pending' end;
 if v_status='pending' then
  perform public.abraca_invalidate_listing_review(l.id,'Remise en publication : nouveau controle requis',false);
  delete from private.moderation_retry_state where listing_id=l.id;
 end if;
 perform set_config('abraca.renewal_write',txid_current()::text,true);
 update public.listings set status=v_status,updated_at=now() where id=l.id returning expires_at into v_expires;
 perform set_config('abraca.renewal_write',coalesce(old_marker,''),true);
 return jsonb_build_object('listing_id',l.id,'status',v_status,'expires_at',v_expires,'moderation_required',v_status='pending');
end $$;
revoke all on function public.renew_private_listing(uuid) from public,anon;
grant execute on function public.renew_private_listing(uuid) to authenticated;
