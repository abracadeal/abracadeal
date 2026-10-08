import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const html = readFileSync(new URL('../aide.html', import.meta.url), 'utf8');
function setup() {
  const elements = new Map();
  for (const id of ['help-search', 'clear-search', 'search-status', 'no-results', 'search-panel']) {
    elements.set(id, { value: '', hidden: true, textContent: '', handlers: {}, addEventListener(name, callback) { this.handlers[name] = callback; }, focus() { this.focused = true; } });
  }
  const sections = [...html.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g)].map(match => {
    const details = [...match[1].matchAll(/<details>([\s\S]*?)<\/details>/g)].map(item => ({
      textContent: item[1].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&'),
      question: item[1].match(/<summary>(.*?)<\/summary>/)[1], hidden: false, open: false
    }));
    return { details, hidden: false, querySelectorAll() { return details; } };
  });
  const entries = sections.flatMap(section => section.details);
  const document = { getElementById: id => elements.get(id), querySelectorAll: selector => selector === '#faq section' ? sections : entries };
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], { document });
  return { elements, sections, entries, search(value) { elements.get('help-search').value = value; elements.get('help-search').handlers.input(); return entries.filter(entry => !entry.hidden); } };
}

test('36 questions, 9 thèmes, contenu accessible sans JavaScript et aucun tarif professionnel', () => {
  const ui = setup();
  assert.equal(ui.entries.length, 36);
  assert.equal(ui.sections.length, 9);
  assert.ok(ui.entries.every(entry => !entry.hidden && !entry.open));
  assert.equal(ui.elements.get('search-panel').hidden, false);
  const pro = html.match(/<h2[^>]*>Professionnels<\/h2>([\s\S]*?)<\/section>/)[1];
  assert.doesNotMatch(pro, /€|\bHT\b/);
  assert.match(html, /4,99 € TTC/);
});
test('recherche dans les questions et réponses, accents et majuscules ignorés', () => {
  const ui = setup();
  assert.deepEqual(ui.search('MOT DE PASSE OUBLIE').map(e => e.question), ['Mot de passe oublié']);
  assert.equal(ui.search('RÉTRACTATION')[0].question, 'Les options sont-elles remboursables ?');
  assert.equal(ui.search('iCal')[0].question, 'Puis-je synchroniser mon calendrier Airbnb ou Booking ?');
  assert.equal(ui.search('60 jours')[0].question, 'Combien de temps restent en ligne les annonces pros ?');
});
test('synonymes, pluriels et recherche de plusieurs mots', () => {
  const ui = setup();
  const questions = term => ui.search(term).map(e => e.question);
  for (const group of [['arnaque', 'escroquerie', 'fraude'], ['supprimer', 'retirer'], ['payer', 'paiement', 'prix'], ['pro', 'professionnel', 'garage', 'agence']]) {
    const expected = questions(group[0]);
    assert.ok(expected.length);
    for (const word of group.slice(1)) assert.deepEqual(questions(word), expected);
  }
  assert.ok(questions('escroquerie').includes('Comment éviter les arnaques ?'));
  assert.ok(questions('retirer annonce').includes('Comment supprimer mon annonce ?'));
  assert.ok(questions('garage').includes('Comment créer un compte professionnel ?'));
  assert.ok(!questions('pro').includes('Puis-je payer sur Abracadeal ?'), 'pro ne correspond pas à propre');
});
test('accordéons ouverts pour les résultats, thèmes masqués, aucun résultat puis effacement', () => {
  const ui = setup();
  ui.entries[0].open = true;
  const matches = ui.search('iCal');
  assert.equal(matches.length, 1);
  assert.ok(matches[0].open);
  assert.equal(ui.sections.filter(section => !section.hidden).length, 1);
  assert.equal(ui.elements.get('search-status').textContent, '1 réponse trouvée');
  assert.equal(ui.search('xyzaucunresultat').length, 0);
  assert.equal(ui.elements.get('no-results').hidden, false);
  assert.match(html, /Vous ne trouvez pas votre réponse \? Écrivez-nous à <a href="mailto:contact@abracadeal.fr">contact@abracadeal.fr<\/a>/);
  ui.elements.get('clear-search').handlers.click();
  assert.ok(ui.entries.every(entry => !entry.hidden));
  assert.ok(ui.sections.every(section => !section.hidden));
  assert.equal(ui.elements.get('no-results').hidden, true);
  assert.equal(ui.entries[0].open, true);
  assert.equal(ui.entries[1].open, false);
  assert.ok(ui.elements.get('help-search').focused);
});
