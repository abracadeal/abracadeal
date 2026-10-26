-- 26/10/2026 (Claude) : bug — Auto Cévennes, inscrit Fondateur n°1 le 19/10, a reçu la relance
-- « seriez-vous intéressé ? » le 26/10. prospect_mailer_claim ne vérifiait pas si le prospect avait déjà un compte.
-- Correctif : ni premier mail ni relance à un prospect dont l'e-mail (ou le code de suivi ?r=) correspond à un compte existant.
do $$
declare d text; n0 int;
  cond text := ' and not exists (select 1 from auth.users u where lower(u.email) = lower(pp.email) or (pp.ref_code is not null and u.raw_user_meta_data->>''prospect_ref'' = pp.ref_code))';
begin
  d := pg_get_functiondef('public.prospect_mailer_claim()'::regprocedure);
  n0 := length(d);
  -- relance
  d := replace(d, 'and pp.last_inbound_contact_at is null and pp.opted_out_at is null',
                  'and pp.last_inbound_contact_at is null and pp.opted_out_at is null' || cond);
  -- premiers mails (2 requêtes)
  d := replace(d, 'and not exists (select 1 from public.email_opt_outs o where lower(o.email) = lower(pp.email))
       order by (pp.segment',
                  'and not exists (select 1 from public.email_opt_outs o where lower(o.email) = lower(pp.email))' || cond || '
       order by (pp.segment');
  if length(d) < n0 + 3 * length(cond) then raise exception 'remplacement incomplet (% -> %)', n0, length(d); end if;
  execute d;
end $$;
