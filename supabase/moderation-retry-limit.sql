-- At most ten automatic retries per listing. A human action can still run the normal safety check.
alter table private.moderation_retry_state add column if not exists last_error text;
alter table private.moderation_retry_state add column if not exists last_error_at timestamptz;
create or replace function private.moderation_retry_response_error(p_status integer,p_content text,p_error text)
returns text language plpgsql immutable security invoker set search_path='' as $$
declare v_body jsonb;
begin
 if nullif(p_error,'') is not null then return left(p_error,2000);end if;
 begin v_body:=p_content::jsonb;exception when others then v_body:=null;end;
 if nullif(v_body->>'ai_error','') is not null then return left(v_body->>'ai_error',2000);end if;
 if nullif(v_body->>'error','') is not null then return left(v_body->>'error',2000);end if;
 if p_status>=400 then return left('HTTP '||p_status||' : '||coalesce(nullif(p_content,''),'réponse indisponible'),2000);end if;
 return null;
end;$$;
revoke all on function private.moderation_retry_response_error(integer,text,text) from public,anon,authenticated;

create or replace function private.dispatch_moderation_retries(p_batch_size integer default 20)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_row record; v_key text; v_url text; v_request bigint; v_count integer:=0;
begin
 -- A concurrent invocation must not dispatch the same batch twice.
 if not pg_try_advisory_xact_lock(hashtext('abracadeal-moderation-retries')) then return 0; end if;
 -- Persist transport errors before pg_net expires its response history.
 update private.moderation_retry_state q set last_error=private.moderation_retry_response_error(h.status_code,h.content,h.error_msg),last_error_at=h.created
 from net._http_response h where h.id=q.request_id
  and private.moderation_retry_response_error(h.status_code,h.content,h.error_msg) is not null;
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
    and coalesce(q.attempts,0)<10
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

-- Only admins may inspect retry counts and the latest failure; the underlying queue remains private.
create or replace function public.admin_moderation_retry_status(p_listing_ids uuid[])
returns table(listing_id uuid,retry_attempts integer,retry_exhausted boolean,retry_last_error text)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Accès administrateur requis';end if;
 return query
 select q.listing_id,q.attempts,
  l.status='pending' and not coalesce(m.ai_checked,false) and q.attempts>=10 and
   (h.id is not null or (m.ai_error is not null and m.checked_at>=q.last_attempt_at) or q.last_attempt_at<=now()-interval '5 minutes'),
  coalesce(private.moderation_retry_response_error(h.status_code,h.content,h.error_msg),
   case when coalesce(m.checked_at,'-infinity'::timestamptz)>=coalesce(q.last_error_at,'-infinity'::timestamptz) then nullif(m.ai_error,'') end,
   q.last_error,nullif(m.ai_error,''),'Aucune réponse de l’analyse de sécurité (interruption ou délai dépassé).')
 from private.moderation_retry_state q
 join public.listings l on l.id=q.listing_id
 left join public.listing_moderation m on m.listing_id=q.listing_id
 left join net._http_response h on h.id=q.request_id
 where q.listing_id=any(p_listing_ids);
end;$$;
revoke all on function public.admin_moderation_retry_status(uuid[]) from public,anon;
grant execute on function public.admin_moderation_retry_status(uuid[]) to authenticated;
