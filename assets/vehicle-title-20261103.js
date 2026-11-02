/* Titres de véhicules propres à l'affichage — partagé par index.html (index-main.js) et pro.html (showroom). */
/* 03/11/2026 (Anthony : « visuellement ça va ? ») : titres de véhicules propres à l'affichage (les annonces ne changent pas) :
   « Mini mini 2.0 205 cooper s jcw » → « Mini 2.0 205 Cooper S JCW », « RENAULT TWINGO Twingo III » → « Renault Twingo III »,
   « Bmw serie 1 116d dkg f40 m sport » → « BMW Série 1 116d DKG F40 M Sport », « Ds ds 7 » → « DS 7 ». */
const VEH_WORDS={bmw:'BMW',ds:'DS',mg:'MG',vw:'VW',byd:'BYD',kia:'Kia',seat:'Seat',mini:'Mini',fiat:'Fiat',ford:'Ford',audi:'Audi',opel:'Opel',dacia:'Dacia',cupra:'Cupra',skoda:'Skoda',smart:'Smart',lexus:'Lexus',jeep:'Jeep',tesla:'Tesla',volvo:'Volvo',honda:'Honda',mazda:'Mazda',nissan:'Nissan',toyota:'Toyota',suzuki:'Suzuki',hyundai:'Hyundai',porsche:'Porsche',jaguar:'Jaguar',peugeot:'Peugeot',renault:'Renault',citroen:'Citroën',citroën:'Citroën',mercedes:'Mercedes',volkswagen:'Volkswagen','land':'Land',rover:'Rover','alfa':'Alfa',romeo:'Romeo',
  serie:'Série',série:'Série',classe:'Classe',amg:'AMG',gt:'GT',gti:'GTI',gtd:'GTD',gte:'GTE',rs:'RS',st:'ST',tdi:'TDI',tsi:'TSI',tfsi:'TFSI',etsi:'eTSI',tgi:'TGI',hdi:'HDi','e-hdi':'e-HDi',bluehdi:'BlueHDi',puretech:'PureTech',dci:'dCi',tce:'TCe',sce:'SCe','e-tech':'E-Tech',ecotsi:'EcoTSI',skyactiv:'Skyactiv','skyactiv-d':'Skyactiv-D','skyactiv-g':'Skyactiv-G',crdi:'CRDi',cdi:'CDI',vvti:'VVT-i',
  bva:'BVA',bvm:'BVM',dsg:'DSG',dct:'DCT',dkg:'DKG',edc:'EDC',cvt:'CVT',awd:'AWD',fwd:'FWD','4x4':'4x4','4matic':'4Matic','4-matic':'4Matic','4motion':'4Motion',quattro:'Quattro',xdrive:'xDrive',sdrive:'sDrive',jcw:'JCW',phev:'PHEV',mhev:'MHEV',hev:'HEV',ev:'EV',suv:'SUV',sw:'SW',tva:'TVA',
  ch:'ch',cv:'cv',kw:'kW',kwh:'kWh',km:'km',et:'et',de:'de',du:'du',des:'des',la:'la',le:'le',les:'les',sur:'sur',avec:'avec',pour:'pour',en:'en',à:'à',
  'm-sport':'M Sport','s-line':'S line','r-line':'R-Line','gt-line':'GT Line','amg-line':'AMG Line','e-hybrid':'e-Hybrid','full-hybrid':'Full Hybrid','8g-dct':'8G-DCT','7g-dct':'7G-DCT','7g-tronic':'7G-Tronic','9g-tronic':'9G-Tronic','s-tronic':'S tronic','speedshift-mct':'Speedshift MCT',
  cdti:'CDTI','s&s':'S&S',soh:'SOH',hse:'HSE',lci:'LCI',gl:'GL',eat:'EAT','2wd':'2WD','4wd':'4WD',bv:'BV',tcss:'TCSS',gse:'GSE',vz:'VZ','e-tsi':'eTSI',vvt:'VVT',fr:'FR','eq-boost':'EQ Boost',bluetec:'BlueTEC',bluemotion:'BlueMotion',i3:'i3',i4:'i4',i5:'i5',i7:'i7',ix:'iX','16v':'16V',coupe:'Coupé',recuperable:'récupérable',tcss:'TCSS',
  gla:'GLA',glb:'GLB',glc:'GLC',gle:'GLE',gls:'GLS',cla:'CLA',cls:'CLS',eqa:'EQA',eqb:'EQB',eqc:'EQC',slk:'SLK',slc:'SLC'};
function vehicleTitleWord(w,first){
  const low=w.toLocaleLowerCase('fr-FR');
  if(Object.prototype.hasOwnProperty.call(VEH_WORDS,low)){const v=VEH_WORDS[low];return first&&/^[a-zà]/.test(v)?v.charAt(0).toUpperCase()+v.slice(1):v;}
  if(/^(ii|iii|iv|vi|vii|viii)$/i.test(w))return w.toUpperCase();          // Twingo III, Golf VII
  if(/^(bva|bvm|eat|edc|dsg)\d{1,2}$/i.test(w))return w.toUpperCase();
  if(/^[a-z]{1,2}\d{1,3}[a-z]?$/i.test(w))return w.toUpperCase();      // a3, x5, c63s, f40, i3
  if(/^\d+[a-z]{1,2}$/i.test(w))return low;                             // 116d, 20i, 180ch
  if(/[0-9]/.test(w))return w;
  const letters=w.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g,'');
  const allUp=letters&&letters===letters.toUpperCase(),allLow=letters&&letters===letters.toLowerCase();
  if(!allUp&&!allLow)return w;                                           // casse déjà travaillée (Twingo, eTSI…)
  return low.replace(/(^|[-'’])([a-zà-öø-ÿ])/g,(m,a,b)=>a+b.toUpperCase());
}
function displayVehicleTitle(raw){
  const parts=String(raw||'').trim().split(/\s+/).filter(Boolean);const out=[];
  for(let i=0;i<parts.length;i++){
    const w=vehicleTitleWord(parts[i],i===0);
    const prev=out[out.length-1];
    if(prev&&prev.toLocaleLowerCase('fr-FR')===w.toLocaleLowerCase('fr-FR')&&/[a-z]/i.test(w))continue; // « Mini mini », « TWINGO Twingo »
    out.push(w);
  }
  return out.join(' ');
}
window.displayVehicleTitle=displayVehicleTitle;
