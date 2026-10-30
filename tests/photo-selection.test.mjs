import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseApimoDetail} from '../supabase/functions/pro-stock-sync/apimo-reader.ts';
import {smartDetail} from '../supabase/functions/pro-stock-sync/smart-reader.ts';
import {isPlaceholderPhoto,dedupePhotos} from '../supabase/functions/pro-stock-sync/photo-utils.ts';
const url='https://garage.example/occasion/123456';
const page=images=>`<html><head><title>Renault Clio 2019</title></head><body><h1>Renault Clio 2019</h1><p>Prix : 12 000 €</p>${images}<p>Ville : Cannes 06400</p></body></html>`;
const row=html=>smartDetail(page(html),url,'vehicules');
// Les noms des images d’attente sont opaques : seul le lien lazy indique la vraie photo.
let r=row('<img src="/photos/opaque-temporary-123.jpg" data-low-src="/photos/blur-a.jpg" data-src="/photos/car-front-123.jpg"><img src="/photos/opaque-temporary-456.jpg" data-src="/photos/car-back-123.jpg">');
assert.deepEqual(r.photos.split('|'),['https://garage.example/photos/car-front-123.jpg','https://garage.example/photos/car-back-123.jpg']);
// L’ordre du srcset ne garantit pas que la dernière image est la plus grande.
r=row('<img src="/photos/placeholder.jpg" data-src="/photos/car-300x200.jpg" data-srcset="/photos/car-1600x1000.jpg 1600w, /photos/car-600x400.jpg 600w"><img data-lazy-src="../photos/rear.jpg" src="/photos/default.jpg">');
assert.deepEqual(r.photos.split('|'),['https://garage.example/photos/car-1600x1000.jpg','https://garage.example/photos/rear.jpg']);
// Attribut plein format ; la miniature du même élément n’est pas ajoutée.
r=row('<div data-image-url="/photos/front.jpg" data-low-src="/photos/blur.jpg"></div><a href="/photos/rear.jpg"><img src="/photos/rear-300x200.jpg"></a>');
assert.deepEqual(r.photos.split('|'),['https://garage.example/photos/front.jpg','https://garage.example/photos/rear.jpg']);
// Une image opaque du logo ou des suggestions ne doit pas passer avant la galerie.
r=row('<img src="/photos/opaque-logo-123.jpg"><div class="property-gallery"><div><img data-src="/photos/front.jpg" src="/photos/opaque-wait.jpg"></div><img src="/photos/rear.jpg"></div><aside><img src="/photos/another-listing.jpg"></aside>');
assert.deepEqual(r.photos.split('|'),['https://garage.example/photos/front.jpg','https://garage.example/photos/rear.jpg']);
// Deux identifiants de photo sur le même endpoint restent deux photos distinctes.
r=row('<img src="/photos/image.jpg?id=1"><img src="/photos/image.jpg?id=2">');
assert.equal(r.photos.split('|').length,2);
// Les liens signés sont renvoyés tels quels ; seuls les paramètres de taille servent au dédoublonnage.
const signed='https://cdn.example/car.jpg?token=abc&width=1600';assert.deepEqual(dedupePhotos(['https://cdn.example/car.jpg?token=abc&width=300',signed]),[signed]);
assert.deepEqual(dedupePhotos(['https://cdn.example/car.jpg?id=1','https://cdn.example/car.jpg?id=2']),['https://cdn.example/car.jpg?id=1','https://cdn.example/car.jpg?id=2']);
for(const name of ['placeholder.jpg','default-photo.png','no_photo.jpg','no-image-available.webp','sans-photo.jpg','photo-indisponible.jpg','image-a-venir.jpg','loading.gif'])assert.ok(isPlaceholderPhoto('https://cdn.example/'+name),name);
for(const name of ['default-house.jpg','noirmoutier-photo.jpg','photo-original.jpg'])assert.ok(!isPlaceholderPhoto('https://cdn.example/'+name),name);
assert.deepEqual(dedupePhotos(['https://cdn.example/default-photo.png','https://cdn.example/no_photo.jpg']),[]);
r=row('<img src="/photos/default.jpg">');assert.ok(r);assert.equal(r.photos,'');
assert.doesNotThrow(()=>row('<img data-original="http://%zz" src="/photos/good.jpg">'));
console.log('Photos: lazy source, original/srcset, default images, missing photo, identity parameters, signed URLs and deduplication OK');

// Même résultat que le lecteur dédié sur les deux vraies galeries Apimo, y compris class multiligne.
for(const [file,url] of [['intuition-property-87285412.html','https://intuition.immo/fr/propriete/vente+appartement+cannes+87285412'],['cannisimmo-property-87522659.html','https://cannisimmo.com/fr/propriete/vente+appartement+cannes+87522659']]){
 const html=fs.readFileSync(new URL('./fixtures/'+file,import.meta.url),'utf8');
 assert.deepEqual(smartDetail(html,url,'immobilier').photos.split('|'),parseApimoDetail(html,url).photos.split('|'));
}

assert.equal(row('<img data-image="123" src="/photos/front.jpg">').photos,'https://garage.example/photos/front.jpg');
