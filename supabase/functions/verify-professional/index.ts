import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function normalizeSiret(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function cleanActivityCode(value: unknown) {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

function classifyBusinessSector(codeValue: unknown, labelValue: unknown) {
  const code = cleanActivityCode(codeValue).replace(/\./g, '');
  const label = String(labelValue ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (code.startsWith('45') || /(automobile|vehicule|voiture|moto|motocycle|garage|concessionnaire)/.test(label)) return 'vehicules';
  if (code.startsWith('68') || /(immobilier|immobiliere|agence immobiliere|transaction immobiliere|administration de biens)/.test(label)) return 'immobilier';
  return 'other';
}

async function lookupCompanyBySiret(siret: string) {
  const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}&page=1&per_page=1`;
  const apiResponse = await fetch(apiUrl, { headers: { Accept: 'application/json', 'User-Agent': 'Abracadeal/1.0' } });
  if (!apiResponse.ok) throw new Error('Le registre des entreprises est momentanément indisponible. Réessaie plus tard.');
  const apiData = await apiResponse.json();
  const company = Array.isArray(apiData?.results) ? apiData.results[0] : null;
  if (!company) throw new Error('Aucune entreprise trouvée pour ce SIRET.');
  const establishments = [company?.siege, ...(Array.isArray(company?.matching_etablissements) ? company.matching_etablissements : [])].filter(Boolean);
  const establishment = establishments.find((e: any) => String(e?.siret || '') === siret) || null;
  if (!establishment) throw new Error('Le SIRET n’a pas pu être confirmé dans le registre officiel.');
  const legalStatus = String(company?.etat_administratif || '').toUpperCase();
  const establishmentStatus = String(establishment?.etat_administratif || '').toUpperCase();
  if ((legalStatus && legalStatus !== 'A') || (establishmentStatus && establishmentStatus !== 'A')) throw new Error('Cet établissement n’est pas indiqué comme actif dans le registre officiel.');
  const siren = String(company?.siren || siret.slice(0, 9));
  const companyName = String(company?.nom_complet || company?.nom_raison_sociale || company?.nom_commercial || 'Entreprise vérifiée').trim();
  const companyCity = String(establishment?.libelle_commune || establishment?.commune || '').trim();
  const companyPostalCode = String(establishment?.code_postal || '').trim();
  const activityCode = cleanActivityCode(establishment?.activite_principale || company?.siege?.activite_principale || company?.activite_principale || '');
  const activityLabel = String(establishment?.libelle_activite_principale || company?.siege?.libelle_activite_principale || company?.libelle_activite_principale || '').trim();
  const businessSector = classifyBusinessSector(activityCode, activityLabel);
  return { siret, siren, company_name: companyName, company_city: companyCity, company_postal_code: companyPostalCode, activity_code: activityCode || null, activity_label: activityLabel || null, business_sector: businessSector };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'lookup').toLowerCase();
    const siret = normalizeSiret(body?.siret);
    if (!/^\d{14}$/.test(siret)) return json({ error: 'Le SIRET doit contenir exactement 14 chiffres.' }, 400);
    const company = await lookupCompanyBySiret(siret);
    if (action === 'lookup') return json({ ok: true, company });
    if (action !== 'verify') return json({ error: 'Action inconnue.' }, 400);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Configuration Supabase incomplète.' }, 500);
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Connexion requise.' }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return json({ error: 'Session invalide.' }, 401);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await admin.from('profiles').select('id, account_type').eq('id', user.id).maybeSingle();
    if (profileError) return json({ error: 'Impossible de lire le profil.' }, 500);
    if (!profile || profile.account_type !== 'professionnel') return json({ error: 'La vérification SIRET est réservée aux comptes professionnels.' }, 403);
    const { data: existing, error: existingError } = await admin.from('pro_verifications').select('user_id').eq('siret', siret).maybeSingle();
    if (existingError) return json({ error: 'Impossible de contrôler ce SIRET pour le moment.' }, 500);
    if (existing && existing.user_id !== user.id) return json({ error: 'Ce SIRET est déjà associé à un autre compte professionnel.' }, 409);
    const { error: upsertError } = await admin.from('pro_verifications').upsert({ user_id: user.id, siret: company.siret, siren: company.siren, company_name: company.company_name, company_city: company.company_city || null, company_postal_code: company.company_postal_code || null, activity_code: company.activity_code || null, activity_label: company.activity_label || null, business_sector: company.business_sector || 'other', verified_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (upsertError) {
      if (String(upsertError.code) === '23505') return json({ error: 'Ce SIRET est déjà associé à un autre compte professionnel.' }, 409);
      console.error(upsertError); return json({ error: 'Impossible d’enregistrer la vérification.' }, 500);
    }
    return json({ ok: true, verified: true, company });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erreur inattendue pendant la vérification.';
    const status = /Aucune entreprise|n’a pas pu être confirmé/.test(message) ? 404 : /pas indiqué comme actif|14 chiffres/.test(message) ? 400 : /momentanément indisponible/.test(message) ? 502 : 500;
    return json({ error: message }, status);
  }
});