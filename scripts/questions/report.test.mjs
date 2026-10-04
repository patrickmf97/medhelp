import test from 'node:test';
import assert from 'node:assert/strict';
import { pilot } from './fixtures/factory.mjs';
const mod = await import('./report.mjs').catch(() => ({}));
test('counts a balanced pilot by area, per-area difficulty and transversal marker', () => {
  assert.equal(typeof mod.buildPilotReport, 'function');
  const r = mod.buildPilotReport(pilot());
  assert.equal(r.total,100); assert.equal(r.mentalHealthCount,10);
  assert.deepEqual(r.countsByDifficulty,{easy:25,medium:50,hard:25});
  assert.equal(r.countsByArea.go,20); assert.deepEqual(r.distributionErrors,[]);
  assert.equal(r.states.draft,100);
});
test('wrong area, missing mental-health coverage and per-area difficulty are reported', () => {
  assert.equal(typeof mod.buildPilotReport, 'function');
  const b = pilot(); b.items[20].area='clinica'; b.items[0].tags=[]; b.items[0].estimatedDifficulty='hard';
  const r = mod.buildPilotReport(b);
  assert.ok(r.distributionErrors.some(x=>x.includes('clinica')));
  assert.ok(r.distributionErrors.some(x=>x.includes('saude_mental')));
  assert.ok(r.distributionErrors.some(x=>x.includes('difficulty')));
});
