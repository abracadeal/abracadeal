import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const html = readFileSync(new URL('../aide.html', import.meta.url), 'utf8');
function setup() {
  const elements = new Map();
  for (const id of ['help-search', 'clear-search', 'search-status', 'no-results', 'search-panel', 'faq', 'search-results']) {
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
  const results = elements.get('search-results');
  results.details = [];
  const appendChild = function(detail) {
    const old = detail.parentNode;
    if (old) old.details.splice(old.details.indexOf(detail), 1);
    this.details.push(detail);
    detail.parentNode = this;
  };
  for (const section of sections) {
    section.appendChild = appendChild;
    section.details.forEach(detail => { detail.parentNode = section; });
  }
  results.appendChild = appendChild;
  const document = { getElementById: id => elements.get(id), querySelectorAll: selector => selector === '#faq section' ? sections : entries };
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], { document });
  return { elements, sections, entries, search(value) { elements.get('help-search').value = value; elements.get('help-search').handlers.input(); return (elements.get('faq').hidden ? results.details : sections.flatMap(section => section.details)).filter(entry => !entry.hidden); } };
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
  assert.equal(ui.search('MOT DE PASSE OUBLIE')[0].question, 'Mot de passe oublié');
  assert.ok(ui.search('RÉTRACTATION').some(e => e.question === 'Les options sont-elles remboursables ?'));
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
  assert.equal(ui.elements.get('search-results').hidden, false);
  assert.equal(ui.elements.get('faq').hidden, true);
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

test('les huit recherches demandées donnent au moins un résultat', () => {
  const ui = setup();
  for (const query of ['rembourser', 'garage', 'arnaque', 'modifier', 'photo', 'mdp', 'airbnb', 'comment vendre ma voiture']) {
    const found = ui.search(query);
    assert.ok(found.length > 0, query);
    console.log(`${query} : ${found.length} résultat(s)`);
  }
});
test('racines de cinq lettres, synonymes ajoutés et petits mots ignorés', () => {
  const ui = setup();
  for (const query of ['rembourser', 'remboursement', 'remboursable', 'annulation']) {
    assert.ok(ui.search(query).some(e => e.question === 'Les options sont-elles remboursables ?'), query);
  }
  assert.ok(ui.search('correction').some(e => e.question === 'Comment modifier mon annonce ?'));
  assert.ok(ui.search('images').some(e => e.question === 'Combien de photos puis-je ajouter ?'));
  assert.ok(ui.search('mdp').some(e => e.question === 'Mot de passe oublié'));
  assert.ok(ui.search('gîte').some(e => e.question === 'Quelles locations sont acceptées ?'));
  assert.ok(ui.search('dénoncer').some(e => e.question === 'Comment signaler une annonce ?'));
  assert.ok(ui.search('support').some(e => e.question === 'Comment contacter Abracadeal ?'));
  assert.ok(ui.search('VERIFICATION').some(e => e.question === "Pourquoi mon annonce n'est-elle pas encore visible ?"));
  assert.deepEqual(ui.search('comment vendre ma voiture').map(e => e.question), ui.search('vendre voiture').map(e => e.question));
  assert.equal(ui.search('le la les de des du un une mon ma mes je comment pourquoi est ce que quoi pour sur et ou').length, 36);
});
test('tri global par mots trouvés, correspondance OU et restauration des thèmes', () => {
  const ui = setup();
  const original = ui.sections.map(section => section.details.map(e => e.question));
  const found = ui.search('photos 15');
  assert.equal(found[0].question, 'Combien coûte une annonce de location de vacances ?');
  assert.ok(found.some(e => e.question === 'Combien de photos puis-je ajouter ?'));
  assert.ok(ui.search('iCal xyzaucunresultat').some(e => e.question === 'Puis-je synchroniser mon calendrier Airbnb ou Booking ?'));
  ui.search('');
  assert.deepEqual(ui.sections.map(section => section.details.map(e => e.question)), original);
  assert.equal(ui.elements.get('search-results').details.length, 0);
});
