-- 22/10/2026 — Bloc « Pas le temps ? » plus visible dans les premiers mails de prospection.
-- Mails en texte brut : mise en valeur par lignes de séparation, titre en majuscules et 3 étapes.
-- Variante A : lien d'inscription dans l'étape 1. Variante B (sans lien) : le lien est envoyé après réponse.
do $$
declare
  old_p text := E'Pas le temps ? Répondez simplement à ce mail avec l''adresse de votre site : avec votre accord, nous mettons votre stock en ligne pour vous. Vous n''aurez plus qu''à le mettre à jour ensuite.';
  sep text := E'━━━━━━━━━━━━━━━━━━━━━━━━';
  k text;
  noun text;
  new_p text;
  s record;
begin
  select * into s from private.prospect_mailer_settings where id = 1 for update;

  foreach k in array array['Garage / concession auto','Concession moto','Agence immobilière',
                           'B:Garage / concession auto','B:Concession moto','B:Agence immobilière'] loop
    noun := case when k like '%moto%' then 'motos' when k like '%immobili%' then 'biens' else 'véhicules' end;
    if k like 'B:%' then
      new_p := sep || E'\nPAS LE TEMPS ? ON S''OCCUPE DE TOUT, GRATUITEMENT.\n\n'
        || E'1. Répondez à ce mail avec l''adresse de votre site (votre réponse vaut accord).\n'
        || E'2. Nous vous envoyons le lien pour créer votre compte Pro (2 minutes).\n'
        || '3. Nous mettons vos ' || noun || ' en ligne pour vous. Vous n''aurez plus qu''à les tenir à jour.'
        || E'\n' || sep;
    else
      new_p := sep || E'\nPAS LE TEMPS ? ON S''OCCUPE DE TOUT, GRATUITEMENT.\n\n'
        || E'1. Créez votre compte Pro (2 minutes) : https://abracadeal.fr/pro-fondateur.html\n'
        || E'2. Répondez à ce mail avec l''adresse de votre site (votre réponse vaut accord).\n'
        || '3. Nous mettons vos ' || noun || ' en ligne pour vous. Vous n''aurez plus qu''à les tenir à jour.'
        || E'\n' || sep;
    end if;
    if position(old_p in s.templates->k->>'body') = 0 then
      raise exception 'Paragraphe introuvable dans le modèle %', k;
    end if;
    s.templates := jsonb_set(s.templates, array[k,'body'],
                             to_jsonb(replace(s.templates->k->>'body', old_p, new_p)));
  end loop;

  -- Modèle par défaut
  if position(old_p in s.body) = 0 then raise exception 'Paragraphe introuvable dans le modèle par défaut'; end if;
  s.body := replace(s.body, old_p, sep || E'\nPAS LE TEMPS ? ON S''OCCUPE DE TOUT, GRATUITEMENT.\n\n'
    || E'1. Créez votre compte Pro (2 minutes) : https://abracadeal.fr/pro-fondateur.html\n'
    || E'2. Répondez à ce mail avec l''adresse de votre site (votre réponse vaut accord).\n'
    || E'3. Nous mettons vos annonces en ligne pour vous. Vous n''aurez plus qu''à les tenir à jour.\n' || sep);

  update private.prospect_mailer_settings
     set templates = s.templates, body = s.body, updated_at = now()
   where id = 1;
end $$;
