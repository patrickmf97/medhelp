import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { compileCatalog } from './compile.mjs';

const root = path.resolve(import.meta.dirname, '../..');
async function fixture(t, mutate) {
  const dir = await mkdtemp(path.join(tmpdir(), 'medhelp-compile-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(path.join(root, 'content'), path.join(dir, 'content'), { recursive: true });
  const file = path.join(dir, 'content/ciclo-basico/catalogo.json');
  const catalog = JSON.parse(await readFile(file, 'utf8'));
  await mutate(catalog, dir);
  await writeFile(file, JSON.stringify(catalog));
  return dir;
}

test('complete catalog preserves identities and deterministic hashes', async () => {
  const bundle = await compileCatalog(root);
  assert.equal(bundle.version, '0.3');
  assert.equal(bundle.lessons.length, 83);
  assert.equal(new Set(bundle.lessons.map(x => x.editorialId)).size, 83);
  assert.equal(new Set(bundle.lessons.map(x => x.moduleId)).size, 72);
  assert.equal(new Set(bundle.lessons.map(x => x.disciplineCode)).size, 12);
  assert(bundle.lessons.every(x => x.blocks.length && /^[a-f0-9]{64}$/.test(x.sourceHash)));
  assert.deepEqual(await compileCatalog(root), bundle);
});

test('lesson boundaries exclude quizzes, retain tables and shared references', async () => {
  const { lessons } = await compileCatalog(root);
  const text = id => lessons.find(x => x.editorialId === id).blocks.map(x => x.content.text).join('\n');
  assert.equal(lessons.filter(x => x.moduleId === 'EG-01').length, 2);
  assert.doesNotMatch(text('EG-01-A2'), /Gabarito comentado|Prática · 8 questões/);
  assert.match(text('EG-01-A2'), /Referências de verificação/);
  assert.match(text('CH-01-A1'), /S1 — OpenStax/);
  assert.match(text('CH-01-A1'), /S2 — Alberts/);
  assert.doesNotMatch(text('CH-01-A1'), /CH-01-Q1/);
  assert.match(text('EB-04-A1'), /\| Resultado \| Com a condição \| Sem a condição \| Total \|/);
});

test('preserves bibliography under every heading used by the approved modules', async () => {
  const { lessons } = await compileCatalog(root);
  for (const [id, citation] of [
    ['CH-02-A1', 'S1 —'], ['CH-03-A1', 'https://histologyguide.com/slidebox/02-epithelium.html'],
    ['CH-04-A1', 'S1 —'], ['BQ-01-A1', 'https://goldbook.iupac.org/terms/view/P04524'],
  ]) {
    const body = lessons.find(lesson => lesson.editorialId === id).blocks.map(block => block.content.text).join('\n');
    assert(body.includes(citation), `${id} lost shared bibliography`);
  }
});

test('bibliography changes affect every lesson hash in the source module', async t => {
  const before = await compileCatalog(root);
  const dir = await fixture(t, async (_catalog, dir) => {
    const file = path.join(dir, 'content/ciclo-basico/modules/ch-02.md');
    await writeFile(file, `${await readFile(file, 'utf8')}\n- S4 — [Fonte adicional](https://example.org/reference).\n`);
  });
  const after = await compileCatalog(dir);
  for (const lesson of before.lessons.filter(item => item.moduleId === 'CH-02')) {
    assert.notEqual(after.lessons.find(item => item.editorialId === lesson.editorialId).sourceHash, lesson.sourceHash);
  }
});

for (const [name, mutate, pattern] of [
  ['path escape', c => { c.modulos[0].arquivo = '../../package.json'; }, /path|caminho/i],
  ['duplicate ID', c => { c.modulos[0].aulas[1].id = c.modulos[0].aulas[0].id; }, /duplic/i],
  ['missing lesson section', c => { c.modulos[0].aulas[0].id = 'CH-01-A99'; }, /section|seção/i],
  ['empty lesson', async (c, dir) => {
    await writeFile(path.join(dir, 'content/ciclo-basico/modules/ch-01.md'), '## CH-01-A1 · Empty\n\n## CH-01-A2 · Next\nText');
  }, /empty|vazi/i],
  ['external symlink', async (c, dir) => {
    await symlink(path.join(root, 'package.json'), path.join(dir, 'content/ciclo-basico/outside.md'));
    c.modulos[0].arquivo = 'outside.md';
  }, /path|caminho/i],
  ['wrong totals', c => { c.modulos.pop(); }, /count|contage/i],
]) {
  test(`rejects ${name}`, async t => {
    const dir = await fixture(t, mutate);
    await assert.rejects(compileCatalog(dir), pattern);
  });
}

test('hash changes with metadata; line-ending normalization is stable', async t => {
  const initial = await compileCatalog(root);
  const dir = await fixture(t, async (c, dir) => {
    c.modulos[0].titulo += ' revisado';
    const file = path.join(dir, 'content/ciclo-basico/disciplinas/eb.md');
    await writeFile(file, (await readFile(file, 'utf8')).replaceAll('\n', '\r\n'));
  });
  const changed = await compileCatalog(dir);
  const hash = (b, id) => b.lessons.find(x => x.editorialId === id).sourceHash;
  assert.notEqual(initial.digest, changed.digest);
  assert.notEqual(hash(initial, 'CH-01-A1'), hash(changed, 'CH-01-A1'));
  assert.equal(hash(initial, 'EB-04-A1'), hash(changed, 'EB-04-A1'));
});

test('CLI does not replace an existing output on invalid catalog', async t => {
  const dir = await fixture(t, c => { c.modulos.pop(); });
  const output = path.join(dir, 'bundle.json');
  await writeFile(output, 'unchanged');
  assert.throws(() => execFileSync(process.execPath, [path.join(root, 'scripts/content/compile.mjs'), '--output', output], { cwd: dir, stdio: 'pipe' }));
  assert.equal(await readFile(output, 'utf8'), 'unchanged');
});
