import test from 'node:test';
import assert from 'node:assert/strict';
import { question, bundle } from './fixtures/factory.mjs';
const mod = await import('./contracts.mjs').catch(() => ({}));

test('complete draft validates without elevating editorial status', () => {
  assert.equal(typeof mod.validateQuestionBundle, 'function');
  assert.equal(mod.validateQuestionBundle(bundle()).ok, true);
});
const invalidCases = [
  ['missing option', q => q.options.pop()], ['wrong answer', q => { q.answer = 'E'; }],
  ['blank rationale', q => { q.rationale = ' '; }], ['nonpositive version', q => { q.version = 0; }],
  ['no reference', q => { q.references = []; }], ['unknown property', q => { q.score = 100; }],
  ['duplicate option', q => { q.options[3].text = q.options[0].text; }],
  ['duplicate option ID', q => { q.options[3].id = 'A'; }],
  ['non-http reference', q => { q.references[0].url = 'file:///etc/passwd'; }],
  ['invalid date', q => { q.references[0].consultedAt = '2026-02-30'; }],
  ['published input', q => { q.status = 'published'; }],
  ['wrong check version', q => { q.checks = [{actor:'Tester',kind:'editorial',version:2,recordedAt:'2026-10-03T00:00:00Z',outcome:'pass',notes:'Test'}]; }],
];
for (const [name, mutate] of invalidCases) test(`rejects ${name}`, () => {
  assert.equal(typeof mod.validateQuestionBundle, 'function');
  const q = question(); mutate(q);
  assert.equal(mod.validateQuestionBundle(bundle([q])).ok, false);
});
test('rejects duplicate IDs, cosmetic exact content and oversized bundles', () => {
  assert.equal(typeof mod.validateQuestionBundle, 'function');
  assert.equal(mod.validateQuestionBundle(bundle([question(), question()])).ok, false);
  const copy = question(2); copy.stem = question().stem; copy.leadIn = question().leadIn; copy.topic = question().topic; copy.learningObjective = question().learningObjective;
  assert.equal(mod.validateQuestionBundle(bundle([question(), copy])).ok, false);
  assert.equal(mod.validateQuestionBundle(bundle(Array.from({length:101},(_,i)=>question(i+1)))).ok, false);
  const huge = question(); huge.stem = 'x'.repeat(5*1024*1024);
  assert.equal(mod.validateQuestionBundle(bundle([huge])).ok, false);
});
test('canonical hash ignores bookkeeping and is independent of object and option order', () => {
  assert.equal(typeof mod.canonicalQuestionHash, 'function');
  const q = question(); const changed = structuredClone(q); changed.editorialId = 'MEDHELP-ENAMED-00002'; changed.status = 'checked'; changed.checks = [];
  assert.equal(mod.canonicalQuestionHash(q), mod.canonicalQuestionHash(changed));
  const reversed = Object.fromEntries(Object.entries(q).reverse()); reversed.options = [...q.options].reverse();
  assert.equal(mod.canonicalQuestionHash(q), mod.canonicalQuestionHash(reversed));
  changed.answer = 'B'; assert.notEqual(mod.canonicalQuestionHash(q), mod.canonicalQuestionHash(changed));
});
test('name and age substitutions are flagged rather than accepted as independent content', () => {
  assert.equal(typeof mod.findDuplicateCandidates, 'function');
  const a = question(1), b = question(2);
  a.stem = 'Maria, 34 anos, procura consulta no serviço por situação fictícia persistente, sem outros dados relevantes.';
  b.stem = 'Joana, 47 anos, procura consulta no serviço por situação fictícia persistente, sem outros dados relevantes.';
  a.leadIn = b.leadIn = 'Qual é a decisão solicitada neste cenário fictício?';
  assert.equal(mod.findDuplicateCandidates([a,b]).length, 1);
});
test('null, cyclic objects and checked without editorial pass fail safely', () => {
  assert.equal(typeof mod.validateQuestionBundle, 'function');
  assert.equal(mod.validateQuestionBundle(null).ok, false);
  const q = question(); q.status = 'checked'; assert.equal(mod.validateQuestionBundle(bundle([q])).ok,false);
  const cycle = bundle(); cycle.self = cycle; assert.equal(mod.validateQuestionBundle(cycle).ok,false);
});
