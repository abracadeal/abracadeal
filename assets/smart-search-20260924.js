/* Abracadeal — recherche intelligente locale, sans API payante.
   Interprétation déterministe : seuls les critères reconnus sont appliqués. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const brands=['mercedes','renault','peugeot','citroen','bmw','audi','volkswagen','toyota','ford','fiat','opel','tesla','volvo','porsche','yamaha','honda','kawasaki','suzuki','ducati','ktm','triumph','harley davidson','apple','samsung'];
const places=['cannes','nice','antibes','monaco','menton','grasse','frejus','saint-tropez','paris','marseille','lyon','bordeaux','toulouse','lille','nantes','montpellier'];
const fuzzyWords=['trottinette','scooter','moto','voiture','vehicule','appartement','immobilier','maison','villa','terrain','vacances','location','mercedes','renault','peugeot','citroen','volkswagen','yamaha','kawasaki','suzuki','telephone','ordinateur','tablette','television','canape','fauteuil','velo'];
function distance(a,b){
 const m=a.length,n=b.length,prev=Array.from({length:n+1},(_,i)=>i),cur=new Array(n+1);
 for(let i=1;i<=m;i++){cur[0]=i;for(let j=1;j<=n;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=n;j++)prev[j]=cur[j];}
 return prev[n];
}
function correctTypos(input){
 return fold(input).split(/(\s+)/).map(word=>{
   if(!/^[a-z0-9-]{4,}$/.test(word))return word;
   let best=word,bestDistance=99;
   for(const candidate of fuzzyWords){const d=distance(word,candidate);if(d<bestDistance){bestDistance=d;best=candidate;}}
   const max=word.length>=8?2:1;
   return bestDistance>0&&bestDistance<=max?best:word;
 }).join('');
}
function interpret(input){
 const text=correctTypos(input),found={},removed=[];
 const category=/\b(appartement|studio|maison|villa|terrain|immobilier|logement)\b/.test(text)?'immobilier':/\b(vacances|saisonniere|sejour|hebergement|gite)\b/.test(text)?'vacances':/\b(moto|motos|scooter)\b/.test(text)?'vehicules':/\b(voiture|voitures|auto|vehicule|vehicules)\b/.test(text)?'vehicules':'';
 // 18/10/2026 : une marque seule (ex. « Mercedes ») reste une recherche globale par mot-clé,
 // toutes catégories (voitures, pièces, jantes, vêtements…). La catégorie n'est choisie que si
 // le type est écrit (voiture, moto, scooter, appartement…).
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
 if(category==='vehicules')found.sub=/\b(moto|motos|scooter)\b/.test(text)?'motos':/\b(voiture|voitures|auto)\b/.test(text)?'voitures':'';
 if(category==='immobilier'){if(/\b(location|louer|loue)\b/.test(text))found.transaction='location';else if(/\b(achat|acheter|vente|vendre)\b/.test(text))found.transaction='vente';}
 let rest=text;for(const piece of removed)rest=rest.replace(piece,' ');
 rest=rest.replace(/\b(je cherche|recherche|cherche|je veux|un|une|des|de|du|avec|pour|en|a|et|moins|plus|budget|voiture|auto|vehicule|moto|immobilier|appartement|maison|villa|vacances|saisonniere|location|achat|acheter|vente|vendre|noire?|blanche?)\b/g,' ');
 found.query=rest.replace(/[^a-z0-9\s-]/g,' ').replace(/\s+/g,' ').trim();
 return found;
}
function apply(id,value){const el=$(id);if(el&&value!==undefined&&value!==null){el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}}
function resetCatalogueScope(){
 // Une recherche depuis la barre IA est toujours globale : elle ne doit jamais hériter
 // d'une catégorie ouverte auparavant (Maison, Auto, Moto, etc.). Les critères compris
 // dans la nouvelle requête sont ensuite réappliqués juste après.
 try{if(typeof activeCategory!=='undefined')activeCategory='';}catch(_){}
 try{if(typeof activeVehicleSubcategory!=='undefined')activeVehicleSubcategory='';}catch(_){}
 apply('filterCategory','');
 apply('filterSubcategory','');
}
function init(){
 const query=$('searchQuery'),search=$('searchBtn');
 if(!query||!search||search.dataset.smartSearchAuto)return;
 search.dataset.smartSearchAuto='1';
 const info=document.createElement('div');
 info.id='abracaSmartSearchInfo';
 info.setAttribute('role','status');
 info.style.cssText='font-size:12px;margin-top:5px;min-height:16px;color:inherit';
 const host=query.closest('.search-card');
 host?.insertAdjacentElement('afterend',info);
 // Capture phase: reset + interprétation avant le gestionnaire de recherche principal.
 // Entrée déclenche déjà search.click() dans le gestionnaire du site.
 search.addEventListener('click',()=>{
  const original=query.value.trim();
  if(!original){info.textContent='';return;}
  resetCatalogueScope();
  const f=interpret(original);
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
  info.textContent=labels.length?'✦ Recherche intelligente : '+labels.join(' · ')+(f.query?' · Mots-clés : '+f.query:''):'';
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();