-- Integration check: all fixtures, leases and HTTP requests roll back. No listing is published.
begin;
do $$
declare v_owner uuid; v_id uuid; v_failed uuid[]:='{}'; v_skip uuid[]:='{}'; v_case text; v_n integer; v_queued integer;
begin
 select id into strict v_owner from public.profiles where is_admin limit 1;
 foreach v_case in array array['rate-limit','timeout','interrupted','orange','manual','blocked','archived'] loop
  insert into public.listings(owner_id,category,title,description,city,seller_type,status,price,created_at,updated_at)
  values(v_owner,'autres','Article test reprise '||v_case,'Article disponible pour test technique','Cannes','particulier',
   case when v_case='archived' then 'archived' else 'pending' end,100,now()-interval '1 day',now()-interval '10 minutes') returning id into v_id;
  if v_case<>'interrupted' then
   insert into public.listing_moderation(listing_id,ai_checked,ai_error,risk_score,risk_level,requires_manual_review,safety_blocked,checked_at)
   values(v_id,v_case in ('orange','manual'),case when v_case='rate-limit' then 'OpenAI Moderation HTTP 429' when v_case='timeout' then 'Timeout' end,
    50,'orange',v_case='manual',v_case='blocked',now()-interval '10 minutes');
  end if;
  if v_case in ('rate-limit','timeout','interrupted') then v_failed:=array_append(v_failed,v_id);else v_skip:=array_append(v_skip,v_id);end if;
 end loop;
 v_n:=private.dispatch_moderation_retries(2);
 if v_n<>2 then raise exception 'Le lot doit être limité à 2 (% reçus)',v_n;end if;
 v_n:=private.dispatch_moderation_retries(20);
 if v_n<>1 then raise exception 'La reprise ne doit traiter que le reste du lot (% reçus)',v_n;end if;
 v_n:=private.dispatch_moderation_retries(20);
 if v_n<>0 then raise exception 'Une annonce déjà relancée ne doit pas être envoyée deux fois';end if;
 if (select count(*) from private.moderation_retry_state where listing_id=any(v_failed) and attempts=1 and next_attempt_at>=date_trunc('minute',now())+interval '15 minutes')<>3 then
  raise exception 'Échecs et interruption doivent être relancés avec délai de 15 minutes';
 end if;
 if exists(select 1 from private.moderation_retry_state where listing_id=any(v_skip)) then raise exception 'La reprise ne doit pas toucher les décisions de modération';end if;
 select count(*) into v_queued from net.http_request_queue h join private.moderation_retry_state q on q.request_id=h.id
 where q.listing_id=any(v_failed) and h.url like '%/moderate-listing' and h.headers ? 'x-internal-moderation-key'
 and convert_from(h.body,'UTF8')::jsonb->>'listing_id'=q.listing_id::text;
 if v_queued<>3 then raise exception 'Trois appels authentifiés du circuit normal sont requis';end if;
 -- A repeated API failure stays eligible on the next interval, until the retry ceiling.
 v_id:=v_failed[1];
 update private.moderation_retry_state set next_attempt_at=now()-interval '1 minute' where listing_id=v_id;
 if private.dispatch_moderation_retries(20)<>1 then raise exception 'Un échec répété doit être relancé';end if;
 if (select attempts from private.moderation_retry_state where listing_id=v_id)<>2 then raise exception 'La deuxième tentative doit être journalisée';end if;
 -- A completed analysis leaves the automatic retry queue, even if awaiting human review.
 update public.listing_moderation set ai_checked=true where listing_id=v_id;
 update private.moderation_retry_state set next_attempt_at=now()-interval '1 minute' where listing_id=v_id;
 if private.dispatch_moderation_retries(20)<>0 then raise exception 'Une analyse terminée ne doit pas être relancée';end if;
 -- The tenth retry is allowed; an eleventh automatic retry must never be queued.
 update public.listing_moderation set ai_checked=false,ai_error='OpenAI Moderation HTTP 429' where listing_id=v_id;
 update private.moderation_retry_state set attempts=9,next_attempt_at=now()-interval '1 minute' where listing_id=v_id;
 if private.dispatch_moderation_retries(20)<>1 then raise exception 'La dixième relance doit être autorisée';end if;
 update private.moderation_retry_state set next_attempt_at=now()-interval '1 minute',last_attempt_at=now()-interval '10 minutes' where listing_id=v_id;
 if private.dispatch_moderation_retries(20)<>0 then raise exception 'La onzième relance doit être interdite';end if;
 if (select attempts from private.moderation_retry_state where listing_id=v_id)<>10 then raise exception 'Le compteur doit rester à 10';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','authenticated')::text,true);
 if not exists(select 1 from public.admin_moderation_retry_status(array[v_id]) where retry_exhausted and retry_attempts=10 and retry_last_error='OpenAI Moderation HTTP 429') then raise exception 'Analyse impossible et dernière erreur doivent être exposées à l’administrateur';end if;
 -- Transport failures are parsed defensively and durable history wins over an older API error.
 if private.moderation_retry_response_error(500,'{"error":"WORKER_ERROR"}',null)<>'WORKER_ERROR' then raise exception 'Erreur réseau invalide';end if;
 if private.moderation_retry_response_error(503,'not JSON',null)<>'HTTP 503 : not JSON' then raise exception 'Réponse non JSON invalide';end if;
 update private.moderation_retry_state set last_error='WORKER_ERROR',last_error_at=now() where listing_id=v_id;
 if not exists(select 1 from public.admin_moderation_retry_status(array[v_id]) where retry_last_error='WORKER_ERROR') then raise exception 'La dernière erreur doit rester conservée';end if;
 update public.listing_moderation set ai_checked=true where listing_id=v_id;
 if exists(select 1 from public.admin_moderation_retry_status(array[v_id]) where retry_exhausted) then raise exception 'Une analyse réussie doit retirer la mention Analyse impossible';end if;
 perform set_config('request.jwt.claims','{}',true);
 begin
  perform * from public.admin_moderation_retry_status(array[v_id]);
  raise exception 'Un visiteur ne doit pas voir le statut de reprise';
 exception when others then
  if sqlerrm<>'Accès administrateur requis' then raise;end if;
 end;
 if has_function_privilege('anon','private.dispatch_moderation_retries(integer)','execute')
  or has_function_privilege('authenticated','private.dispatch_moderation_retries(integer)','execute') then raise exception 'La relance doit rester inaccessible aux clients';end if;
end $$;
rollback;
