begin;
do $$
declare v_owner uuid;v_plan public.pro_subscription_plans;v_id uuid;v_candidate uuid;v_proposal jsonb;v_date timestamptz:=now()-interval '2 days';
begin
 select id into v_owner from public.profiles where account_type='professionnel' and private.moderation_user_allowed(id) limit 1;
 if v_owner is null then select id into strict v_owner from public.profiles where is_admin limit 1;end if;
 select * into strict v_plan from public.pro_subscription_plans where active and 'vehicules'=any(category_scope) order by listing_limit limit 1;
 insert into public.pro_subscriptions(user_id,plan_code,status,listing_limit,current_period_end) values(v_owner,v_plan.code,'active',v_plan.listing_limit,now()+interval '1 month') on conflict(user_id) do update set plan_code=excluded.plan_code,status='active',listing_limit=excluded.listing_limit,current_period_end=excluded.current_period_end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','service_role')::text,true);
 insert into public.listings(owner_id,category,title,description,price,city,seller_type,source,status,created_at) values(v_owner,'vehicules','Renault Captur stock test','Véhicule disponible en bon état professionnel',10000,'Cannes','professionnel','feed','pending',v_date) returning id into v_id;
 insert into public.listing_moderation(listing_id,ai_checked,risk_level,risk_score,safety_snapshot) select v_id,true,'green',0,jsonb_build_object('text',title||E'\n'||description,'photos','[]'::jsonb) from public.listings where id=v_id;
 update public.listings set status='active' where id=v_id;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','authenticated')::text,true);
 v_proposal:=public.prepare_listing_change(v_id,'{"title":"Renault Captur stock mis à jour"}',false,null);v_candidate:=(v_proposal->>'listing_id')::uuid;
 if v_proposal->>'free'<>'true' then raise exception 'Modification Pro synchronisée non incluse';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','service_role')::text,true);
 insert into public.listing_moderation(listing_id,ai_checked,risk_level,risk_score,safety_snapshot) select v_candidate,true,'green',0,jsonb_build_object('text',title||E'\n'||description,'photos','[]'::jsonb) from public.listings where id=v_candidate;
 perform public.complete_listing_revision(v_candidate,true,null);
 if (select title from public.listings where id=v_id)<>'Renault Captur stock mis à jour' or (select created_at from public.listings where id=v_id)<>v_date or (select boosted_at from public.listings where id=v_id) is not null then raise exception 'Modification Pro non appliquée ou remontée indue';end if;
end $$;
set constraints all immediate;
rollback;
