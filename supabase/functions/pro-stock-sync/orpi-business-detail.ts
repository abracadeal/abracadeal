import {sDecode} from './smart-reader.ts';
import {dedupePhotos} from './photo-utils.ts';
const clean=(s:string)=>sDecode(s.replace(/<svg\b[\s\S]*?<\/svg>/gi,'').replace(/<br\s*\/?>|<\/(?:p|li|div|strong)>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[\u0080\u0085\u0091-\u0094\u0096\u0097]/g,c=>({'\u0080':'€','\u0085':'…','\u0091':'‘','\u0092':'’','\u0093':'“','\u0094':'”','\u0096':'–','\u0097':'—'}[c]||c)).replace(/[ \t\u00a0\u202f]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
function description(html:string){const m=/<div\b[^>]*class="s-cms mt-p"[^>]*>/i.exec(html);if(!m)return '';const tags=/<\/?div\b[^>]*>/gi;tags.lastIndex=m.index+m[0].length;let depth=1;for(let t;(t=tags.exec(html));){depth+=/^<\//.test(t[0])?-1:1;if(!depth)return clean(html.slice(m.index+m[0].length,t.index));}return '';}
export function parseOrpiBusinessDetail(html:string,url:string){
 const reference=sDecode(html.match(/data-estate-reference="([^"]+)"/)?.[1]||'');if(!reference)return null;
 let meta:any;for(const m of html.matchAll(/data-eulerian-action="([^"]+)"/g)){try{const j=JSON.parse(sDecode(m[1]));if(j.prdref===reference&&j.typeBien&&j.nomVille){meta=j;break;}}catch{}}
 if(!meta)return null;
 const header=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'';const desc=description(html);if(!header||!desc)return null;
 const transaction=/location|rent/i.test(meta.typeTransaction||'')?'location':'vente';const price=html.match(/<strong class="h2 text-primary">([\s\S]*?)<\/strong>([\s\S]{0,250}?)<\/p>/i);const priceText=clean(price?.[1]||''),unit=clean(price?.[2]||'');const priceUnit=priceText+' '+unit;const amount=Number(priceText.replace(/[^0-9,.]/g,'').replace(',','.'));
 const o:any={reference,url,titre:clean(header).replace(/\n/g,' · '),type_bien:meta.typeBien,transaction,ville:meta.nomVille,code_postal:meta.codePostal||'',description:desc,texte_page:clean(html.slice(html.indexOf('id="collapse-details"'),html.indexOf('<aside')))};
 if(amount>0&&!/m[²2]/i.test(priceUnit)){if(transaction==='vente'||/par mois|\/\s*mois/i.test(priceUnit))o.prix=String(amount);else if(/par an|annuel|\/\s*an/i.test(priceUnit)){o.prix=String(Math.round(amount/12*100)/100);o.description+='\nLoyer annuel affiché à la source : '+priceText+'.';}}
 if(meta.surfaceBien>0)o.surface=String(meta.surfaceBien);if(meta.nbPieces>0)o.pieces=String(meta.nbPieces);if(meta.nbChambres>0)o.chambres=String(meta.nbChambres);if(meta.etage!=null)o.etage=String(meta.etage);if(meta.anneeConstruction>0)o.annee_construction=String(meta.anneeConstruction);
 const photos:string[]=[];for(const m of html.slice(0,html.search(/<h1\b/i)).matchAll(/<img\b[^>]*>/gi)){for(const a of m[0].matchAll(/(?:\s)(?:src|data-src)="([^"]+)"/gi)){try{const u=new URL(sDecode(a[1]),url);if(/^https?:$/.test(u.protocol)&&u.searchParams.get('p')==='default')photos.push(u.toString());}catch{}}}o.photos=dedupePhotos(photos).join('|');
 const ec=['','A','B','C','D','E','F','G'];if(ec[Number(meta.dpe)])o.dpe=ec[Number(meta.dpe)];if(ec[Number(meta.ges)])o.ges=ec[Number(meta.ges)];
 const fees=html.match(/<h2[^>]*>Honoraires<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];if(fees)o.honoraires=clean(fees);
 const aside=html.match(/<aside\b[^>]*>([\s\S]*?)<\/aside>/i)?.[1]||'';const name=aside.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1];const phone=aside.match(/href="tel:([^"]+)"/i)?.[1];if(name&&phone){o.contact_nom=clean(name)+(/data-test-agency-link/.test(aside)?' (agence)':'');o.contact_telephone=sDecode(phone);}
 return o;
}
