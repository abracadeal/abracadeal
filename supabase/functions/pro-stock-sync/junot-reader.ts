// Junot : onglets actifs de l'agence, jamais les biens vendus ni les suggestions.
import { sDecode } from './smart-reader.ts';
import { apimoDiagnostic } from './apimo-reader.ts';
type Fetcher=(u:URL)=>Promise<{text:string,url:URL}>;
const clean=(s:string)=>sDecode(s.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi,'$1').replace(/<br\s*\/?>|<\/(?:p|li|div|h[1-6])>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
const num=(s:string)=>s.replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
const block=(h:string,c:string,tag='div')=>h.match(new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${c}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]||'';
export function junotAgencyLinks(html:string,base:URL){
  const section=html.match(/<section\b[^>]*class="[^"]*\bproducts-slider\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i)?.[1]||'';
  const tabs=section.split(/(?=<div\b[^>]*data-tabgroup="products-slider"[^>]*data-tab=)/i);
  const active=tabs.filter(t=>/^<div\b[^>]*data-tab="(?:En vente|En location|À louer)"/i.test(t)).join('');
  return [...new Set([...active.matchAll(/href="([^"#]+)"/g)].flatMap(m=>{try{const u=new URL(sDecode(m[1]),base);return u.hostname===base.hostname&&/^\/fr\/biens\/\d+-[^/]+\/?$/.test(u.pathname)?[u.origin+u.pathname]:[];}catch{return [];}}))];
}
export function parseJunotDetail(raw:string,url:string){
  const id=new URL(url).pathname.match(/^\/fr\/biens\/(\d+)-/)?.[1];if(!id)return null;
  const h=raw.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  const sidebar=h.slice(h.indexOf('<div class="product-sidebar">'),h.indexOf('<div class="product-content">'));
  const body=h.slice(h.indexOf('<div class="product-content">')).split(/<section\b/)[0];
  const title=clean(block(sidebar,'product-sidebar-title','h1'));
  const description=clean(block(body,'product-description'));
  if(!title||!description)return null;
  const meta=sDecode(raw.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]||'');
  const loc=meta.match(/^(.+?)\s+(\d{5})\b/);
  const features=[...body.matchAll(/<li\b[^>]*class="product-features-item"[^>]*>([\s\S]*?)<\/li>/g)].map(m=>clean(m[1]));
  const all=features.join('\n');const price=clean(block(sidebar,'product-sidebar-price-inner','p'));
  const o:any={reference:id,mandat:clean(block(body,'product-reference','p')).replace(/^Référence de l.annonce\s*:\s*/i,''),url,titre:title.replace(/\n/g,' — '),description,type_bien:clean(sidebar.match(/<small\b[^>]*>([\s\S]*?)<\/small>/)?.[1]||''),transaction:/\bLocation\b/i.test(meta)?'location':'vente',ville:loc?.[1]||'',code_postal:loc?.[2]||'',prestations:features.join('|'),texte_page:clean(body.replace(/<img\b[^>]*>/gi,''))};
  if(/\d/.test(price))o.prix=num(price.replace(/[^\d\s.,]/g,''));
  const area=all.match(/Habitable\s*:\s*([\d.,]+)\s*m²/i)||all.match(/(?:^|\n)([\d.,]+)\s*m²/i);if(area)o.surface=num(area[1]);
  for(const [key,re] of [['pieces',/(\d+)\s*pièces?/i],['chambres',/(\d+)\s*chambres?/i]] as const){const m=all.match(re);if(m)o[key]=m[1];}
  const bath=[...all.matchAll(/(\d+)\s*salles? de (?:bains?|douche)/gi)].reduce((s,m)=>s+Number(m[1]),0);if(bath)o.salles_de_bain=String(bath);
  const exposition=all.match(/Exposition\s+([^\n]+)/i);if(exposition)o.exposition=exposition[1];
  o.honoraires=clean(block(sidebar,'product-sidebar-price')).split('\n').filter(t=>/honoraires|charge.*(?:vendeur|acqu[ée]reur|locataire)/i.test(t)).join(' | ');
  const gallery=h.slice(h.indexOf('id="galerie"')).split('class="product-tabs-content-item"')[1]?.split('class="product-tabs-content-item"')[0]||'';
  const photos=new Map<string,string>();for(const m of gallery.matchAll(/<img\b[^>]*src="([^"]+)"/gi)){const src=sDecode(m[1]);if(!/^https:\/\/media\.apimo\.pro\//i.test(src))continue;const key=src.replace(/_\d+-original\.(?:webp|jpe?g|png)$/i,'');if(!photos.has(key))photos.set(key,src);}o.photos=[...photos.values()].join('|');
  for(const m of body.matchAll(/<img\b[^>]*src="([^"]+)"/gi)){const src=sDecode(m[1]);if(!src.startsWith('data:image/svg+xml;base64,'))continue;try{const svg=new TextDecoder().decode(Uint8Array.from(atob(src.split(',')[1]),c=>c.charCodeAt(0)));const d=apimoDiagnostic(svg);if(d.kind&&d.letter)o[d.kind]=d.letter;if(d.kind==='dpe'&&d.values[0])o.consommation_energie=d.values[0];}catch{}}
  const t=o.texte_page;const charges=t.match(/Montant moyen annuel de la quote part de charges courantes\s*:\s*([\d\s.,]+)\s*€/i);if(charges)o.charges_annuelles=num(charges[1]);const tax=t.match(/Taxe foncière\s*:\s*([\d\s.,]+)\s*€/i);if(tax)o.taxe_fonciere=num(tax[1]);
  return o;
}
export async function readJunot(start:URL,home:string,fetchHtml:Fetcher){
  if(/^\/fr\/biens\/\d+-/.test(start.pathname)){const r=parseJunotDetail(home,start.toString());return r?[r]:[];}
  if(!/^\/fr\/agences\/[^/]+\/?$/.test(start.pathname))throw Error('Pour Junot, utiliser la page de votre agence.');
  const links=junotAgencyLinks(home,start);if(!links.length)throw Error('Aucun bien actif dans les onglets de cette agence Junot.');
  const rows:any[]=[];let i=0;
  await Promise.all(Array.from({length:3},async()=>{while(i<links.length){const url=links[i++];try{const {text}=await fetchHtml(new URL(url));rows.push(parseJunotDetail(text,url)||{reference:new URL(url).pathname.split('/').pop(),url});}catch{rows.push({reference:new URL(url).pathname.split('/').pop(),url});}}}));
  // Le site annonce les « derniers biens », sans total ni liste exhaustive d'agence.
  // L'aperçu reste utile, mais ne doit pas autoriser de retrait automatique du stock.
  (rows as any).partial=true;(rows as any).stats={pages:1,details:links.length,read:rows.length,note:'Derniers biens proposés par cette agence ; stock exhaustif non confirmé.'};return rows;
}
