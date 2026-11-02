-- 02/11/2026 — Claude — demande d'Anthony : « envoyer [les relances] en plus du prospect ».
-- Avant : le quota quotidien de chaque boîte (daily_limit) était partagé entre premiers mails et relances (moitié-moitié).
-- Maintenant : les premiers mails ont tout le quota ; les relances partent EN PLUS, avec leur propre quota (même valeur),
-- au même rythme réparti sur la journée. Règles de sélection inchangées (catégories, segments, NAF, désinscrits, inscrits).
create or replace function public.prospect_mailer_claim()
 returns json language plpgsql security definer set search_path to '' as $function$
declare s record; m record; p record; f record; out json[] := '{}'; v_cat text;
  v_local timestamp := now() at time zone 'Europe/Paris';
  v_day timestamptz := (date_trunc('day', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
  v_frac numeric; v_quota int; v_fu int; v_first int;
begin
  select * into s from private.prospect_mailer_settings where id = 1;
  if not s.sending_enabled then return '[]'::json; end if;
  if s.weekdays_only and extract(isodow from v_local) = 7 then return '[]'::json; end if;
  if extract(hour from v_local) < s.window_start or extract(hour from v_local) >= s.window_end then return '[]'::json; end if;
  update public.prospection_prospects set status = 'ready', updated_at = now()
   where status = 'sending' and updated_at < now() - interval '15 minutes';
  update public.prospection_prospects set followup_status = null, updated_at = now()
   where followup_status = 'sending' and updated_at < now() - interval '15 minutes';
  v_frac := (extract(epoch from v_local - date_trunc('day', v_local)) / 3600.0 - s.window_start) / greatest(1, s.window_end - s.window_start);
  for m in select * from private.prospect_mailboxes where enabled and vault_secret_id is not null and verified_at is not null order by sort loop
    v_quota := least(m.daily_limit, ceil(m.daily_limit * v_frac)::int + 1);
    select count(*) filter (where followup_sent_at >= v_day or followup_status = 'sending'),
           count(*) filter (where sent_at >= v_day or status = 'sending')
      into v_fu, v_first
      from public.prospection_prospects where sent_from = m.email;
    -- 1) premier mail (quota complet de la boîte)
    if v_first < v_quota then
      v_cat := null;
      select k.key into v_cat
        from jsonb_each(s.category_mix) k
       where (k.value)::numeric > 0
         and exists (select 1 from public.prospection_prospects r where r.status = 'ready' and r.category = k.key and r.site_check_status in ('ok','manual','generic')
                      and coalesce(r.segment,'') <> 'phase2_reseau' and coalesce(r.segment,'') not like 'exclu%'
                      and not (r.category in ('Garage / concession auto','Concession moto') and r.naf is not null and r.naf !~ '^(45\.|77\.1)'))
       order by ((select count(*) from public.prospection_prospects t where t.category = k.key and t.sent_from is not null
                   and (t.sent_at >= v_day or t.status = 'sending')) + 1) / (k.value)::numeric, k.key
       limit 1;
      select pp.* into p from public.prospection_prospects pp
       where pp.status = 'ready' and pp.site_check_status in ('ok','manual','generic')
         and (v_cat is null or pp.category = v_cat)
         and coalesce(pp.segment,'') <> 'phase2_reseau' and coalesce(pp.segment,'') not like 'exclu%'
         and not (pp.category in ('Garage / concession auto','Concession moto') and pp.naf is not null and pp.naf !~ '^(45\.|77\.1)')
         and not exists (select 1 from public.email_opt_outs o where lower(o.email) = lower(pp.email))
         and not exists (select 1 from auth.users u where lower(u.email) = lower(pp.email) or (pp.ref_code is not null and u.raw_user_meta_data->>'prospect_ref' = pp.ref_code))
       order by (pp.site_check_status in ('ok','manual')) desc, (pp.segment = 'petit_pro') desc nulls last, pp.created_at limit 1 for update skip locked;
      if found then
        update public.prospection_prospects set status = 'sending', sent_from = m.email, updated_at = now() where id = p.id;
        out := out || json_build_object('id', p.id, 'email', p.email, 'company', p.company, 'mailbox', m.email, 'category', p.category, 'kind', 'first');
      end if;
    end if;
    -- 2) relance, en plus du premier mail (quota séparé)
    if v_fu < v_quota then
      select pp.* into f from public.prospection_prospects pp
       where pp.status = 'sent' and pp.sent_from = m.email and pp.followup_status is null
         and pp.sent_at < now() - interval '5 days'
         and pp.last_inbound_contact_at is null and pp.opted_out_at is null
         and not exists (select 1 from auth.users u where lower(u.email) = lower(pp.email) or (pp.ref_code is not null and u.raw_user_meta_data->>'prospect_ref' = pp.ref_code))
         and not exists (select 1 from public.email_opt_outs o where lower(o.email) = lower(pp.email))
       order by pp.sent_at limit 1 for update skip locked;
      if found then
        update public.prospection_prospects set followup_status = 'sending', updated_at = now() where id = f.id;
        out := out || json_build_object('id', f.id, 'email', f.email, 'company', f.company, 'mailbox', m.email, 'category', f.category,
                                        'kind', 'followup', 'in_reply_to', f.gmail_message_id);
      end if;
    end if;
  end loop;
  return coalesce(array_to_json(out), '[]'::json);
end $function$;
