import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const read = path => readFileSync(path, 'utf8');

test('durées publiques, archives existantes et exceptions légales explicites', () => {
 const privacy=read('confidentialite.html');
 for(const text of ['2 ans sans action','2 ans après le dernier échange','archive privée pendant 5 ans','1 an après la clôture','10 ans à compter de la clôture','1 mois','7, 14 ou 30 jours']) assert.ok(privacy.includes(text),text);
 for(const file of ['cgu.html','confidentialite.html','cookies.html','cgv.html']) assert.doesNotMatch(read(file),/à compléter|reste à définir|restent à finaliser|Ce projet/);
 assert.match(read('cgv.html'),/adhésion n’a pas été établie/);
 assert.match(read('cgv.html'),/service effectivement fourni/);
 assert.match(read('cgv.html'),/au prorata/);
 assert.match(read('aide.html'),/tant que la prestation n'est pas entièrement exécutée/);
});
test('vues intégrées synchronisées, CGV et scripts accessibles',()=>{
 const home=read('index.html'),vac=read('vacances.html');
 for(const file of ['cgu.html','confidentialite.html','cookies.html','classement-annonces.html']){
  const body=read(file).split('</h1>')[1].split('</main>')[0];
  assert.ok(home.includes(body),file);
 }
 assert.ok(vac.includes(read('confidentialite.html').split('</h1>')[1].split('</main>')[0].trim()));
 for(const file of ['index.html','vacances.html','espace-hote.html']) assert.match(read(file),/assets\/legal-registration\.js/);
 for(const file of ['assets/index-main.js','assets/vacances-main.js','assets/espace-hote.js']){
  const source=read(file);assert.ok(source.indexOf('await window.confirmLegalRegistration()') < source.indexOf('.auth.signUp('));assert.match(source,/\.\.\.legalAcceptance/);
 }
});
test('accord à l’inscription décoché, annulation sans création et date conservée après accord',async()=>{
 function boot(){
  const checkbox={checked:false},submit={disabled:true},form={},cancel={};
  const dialog={style:{},setAttribute(){},showModal(){},remove(){this.removed=true},querySelector(selector){return selector==='input'?checkbox:selector==='[type=submit]'?submit:selector==='form'?form:cancel;}};
  const context=vm.createContext({window:{},Date,document:{createElement(){return dialog},body:{append(){}}}});
  vm.runInContext(read('assets/legal-registration.js'),context);
  return {dialog,checkbox,submit,form,cancel,promise:context.window.confirmLegalRegistration()};
 }
 const canceled=boot();assert.equal(canceled.submit.disabled,true);canceled.cancel.onclick();assert.equal(await canceled.promise,null);
 const ui=boot();ui.form.onsubmit({preventDefault(){}});assert.equal(ui.dialog.removed,undefined);
 ui.checkbox.checked=true;ui.checkbox.onchange({target:ui.checkbox});assert.equal(ui.submit.disabled,false);
 ui.form.onsubmit({preventDefault(){}});const result=await ui.promise;
 assert.equal(result.legal_terms_version,'2026-10-08');assert.equal(result.legal_majority_confirmed,true);assert.ok(Number.isFinite(Date.parse(result.legal_terms_accepted_at)));
});
test('brouillon hôte conservé 30 jours puis effacé, ancien format migré sans perdre les données',()=>{
 const source=read('assets/espace-hote.js').split('function getHostDraft(){')[1].split('function saveHostDraft(){')[0];
 const data=new Map(),now=2000000000000;
 const context=vm.createContext({Date:{now:()=>now},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}});
 vm.runInContext('function getHostDraft(){'+source,context);
 const key='abraca_host_signup_draft';
 data.set(key,JSON.stringify({_savedAt:now-29*86400000,oTitle:'Mon logement'}));assert.equal(context.getHostDraft().oTitle,'Mon logement');
 data.set(key,JSON.stringify({_savedAt:now-31*86400000,oTitle:'Ancien'}));assert.equal(context.getHostDraft(),null);assert.equal(data.has(key),false);
 data.set(key,JSON.stringify({oTitle:'Brouillon existant'}));assert.equal(context.getHostDraft().oTitle,'Brouillon existant');assert.equal(JSON.parse(data.get(key))._savedAt,now);
});
