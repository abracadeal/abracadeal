/* Abracadeal — recherche intelligente locale, sans API payante.
   Interprétation déterministe : seuls les critères reconnus sont appliqués. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const brands=['mercedes','renault','peugeot','citroen','bmw','audi','volkswagen','toyota','ford','fiat','opel','tesla','volvo','porsche','yamaha','honda','kawasaki','suzuki','ducati','ktm','triumph','harley davidson','apple','samsung'];
const places=['cannes','nice','antibes','monaco','menton','grasse','frejus','saint-tropez','paris','marseille','lyon','bordeaux','toulouse','lille','nantes','montpellier'];
function interpret(input){
 const text=fold(input),found={},removed=[];
 const category=/\b(appartement|studio|maison|villa|terrain|immobilier|logement)\b/.test(text)?'immobilier':/\b(vacances|saisonniere|sejour|hebergement|gite)\b/.test(text)?'vacances':/\b(moto|scooter|yamaha|kawasaki|ducati|ktm|triumph)\b/.test(text)?'vehicules':/\b(voiture|auto|vehicule|mercedes|renault|peugeot|bmw|audi|tesla)\b/.test(text)?'vehicules':'';
 if(category)found.category=category;
 const budget=text.match(/(?:moins de|maximum|max|budget(?: de)?|jusqu.a|sous)\s*(\d[\d\s.,]*)\s*(k\s*€|k€|€|euros?)/);
 if(budget){let n=Number(budget[1].replace(/[\s,]/g,''));if(budget[2].startsWith('k'))n*=1000;if(n>0&&n<100000000)found.maxPrice=Math.round(n);removed.push(budget[0]);}
 const km=text.match(/(?:moins de|max(?:imum)?|jusqu.a|sous)\s*(\d[\d\s.,]*)\s*(?:km|kilometres?)/);
 if(km){const n=Number(km[1].replace(/[\s,.]/g,''));if(n>0&&n<2000000)found.maxKm=n;removed.push(km[0]);}
 const area=text.match(/(?:plus de|minimum|min|au moins)\s*(\d{2,4})\s*m(?:2|²)/);
 if(area){found.minArea=Number(area[1]);removed.push(area[0]);}
 const city=places.find(p=>new RegExp('\\b'+p.replace('-','[-\\s]')+'\\b').test(text));
 if(city){found.city=city;removed.push(new RegExp('(?:\\b(?:a|sur|vers|pres de|autour de|dans)\\s+)?'+city.replace('-','[-\\s]'),'i'));}
 const brand=brands.find(b=>new RegExp('\\b'+b+'\\b').test(text));
 if(brand&&category==='vehicules'){found.brand=brand;removed.push(new RegExp('\\b'+brand+'\\b','i'));}
 if(category==='vehicules')found.sub=/\b(moto|scooter|yamaha|kawasaki|ducati|ktm|triumph)\b/.test(text)?'motos':/\b(voiture|auto|mercedes|renault|peugeot|bmw|audi|tesla)\b/.test(text)?'voitures':'';
 if(category==='immobilier'){if(/\b(location|louer|loue)\b/.test(text))found.transaction='location';else if(/\b(achat|acheter|vente|vendre)\b/.test(text))found.transaction='vente';}
 let rest=text;for(const piece of removed)rest=rest.replace(piece,' ');
 rest=rest.replace(/\b(je cherche|recherche|cherche|je veux|un|une|des|de|du|avec|pour|en|a|et|moins|plus|budget|voiture|auto|vehicule|moto|immobilier|appartement|maison|villa|vacances|saisonniere|location|achat|acheter|vente|vendre|noire?|blanche?)\b/g,' ');
 found.query=rest.replace(/[^a-z0-9\s-]/g,' ').replace(/\s+/g,' ').trim();
 return found;
}
function apply(id,value){const el=$(id);if(el&&value!==undefined&&value!==null){el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}}
function init(){
 const query=$('searchQuery'),search=$('searchBtn');if(!query||!search||$('abracaSmartSearch'))return;
 const btn=document.createElement('button');btn.id='abracaSmartSearch';btn.type='button';btn.textContent='✦ Recherche intelligente';btn.setAttribute('aria-label','Comprendre votre recherche et appliquer les filtres automatiquement');
 btn.style.cssText='border:1px solid #9d7bda;border-radius:12px;padding:10px 15px;background:#f6f0ff;color:#6036a1;font-weight:700;cursor:pointer;white-space:nowrap;max-width:100%';
 const info=document.createElement('div');info.id='abracaSmartSearchInfo';info.setAttribute('role','status');info.style.cssText='font-size:12px;margin-top:5px;min-height:16px;color:inherit';
 const wrapper=document.createElement('div');wrapper.style.cssText='display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:9px';wrapper.append(btn);const host=query.closest('.search-card');host?.insertAdjacentElement('afterend',wrapper);wrapper.insertAdjacentElement('afterend',info);
 btn.addEventListener('click',()=>{
  const original=query.value.trim();if(!original){query.focus();info.textContent='Décrivez ce que vous recherchez.';return;}
  const f=interpret(original);if(!Object.keys(f).some(k=>k!=='query')){info.textContent='Aucun critère précis reconnu : recherche classique lancée.';search.click();return;}
  if(f.category)apply('filterCategory',f.category);
  if(f.sub)apply('filterSubcategory',f.sub);
  if(f.maxPrice)apply('filterPriceMax',f.maxPrice);
  if(f.maxKm)apply('filterMileageMax',f.maxKm);
  if(f.minArea)apply('filterImmoSurfaceMin',f.minArea);
  if(f.transaction)apply('filterImmoTransaction',f.transaction);
  if(f.brand)apply('filterVehicleMake',f.brand);
  if(f.city)apply('searchCity',f.city);
  query.value=f.query;
  const labels=[f.category,f.brand,f.city,f.maxPrice?'≤ '+f.maxPrice.toLocaleString('fr-FR')+' €':'',f.maxKm?'≤ '+f.maxKm.toLocaleString('fr-FR')+' km':'',f.minArea?'≥ '+f.minArea+' m²':''].filter(Boolean);
  info.textContent='Critères détectés : '+labels.join(' · ')+(f.query?' · Mots-clés : '+f.query:'');
  search.click();
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();