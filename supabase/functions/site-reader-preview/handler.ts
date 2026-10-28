type Dependencies = {
  authorize: (req: Request) => Promise<boolean>;
  read: (url: string, sector: string) => Promise<Record<string, unknown>>;
};
const headers = {'Access-Control-Allow-Origin':'https://abracadeal.fr',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json',
  'Cache-Control':'no-store'};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status,headers});
export function makePreviewHandler(deps: Dependencies) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok',{headers});
    if (req.method !== 'POST') return json({error:'Méthode non autorisée'},405);
    try {
      if (!await deps.authorize(req)) return json({error:'Connexion administrateur requise'},401);
      let body: any;
      try { body = await req.json(); } catch { return json({error:'Requête JSON invalide'},400); }
      if (body?.action !== 'preview_url') return json({error:'Ce lecteur accepte uniquement les aperçus.'},400);
      if (typeof body.url !== 'string' || body.url.length > 2000) return json({error:'Adresse invalide'},400);
      let url: URL;
      try { url = new URL(body.url); } catch { return json({error:'Adresse invalide'},400); }
      if (!['https:','http:'].includes(url.protocol) || url.username || url.password) return json({error:'Adresse publique sans identifiants requise'},400);
      if (!['immobilier','vehicules'].includes(body.sector)) return json({error:'Domaine invalide'},400);
      return json({ok:true,preview_only:true,...await deps.read(url.toString(),body.sector)});
    } catch (error) {
      return json({error:error instanceof Error ? error.message.slice(0,500) : 'Lecture impossible'},422);
    }
  };
}
