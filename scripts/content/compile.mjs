import { readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { disciplineTitles, hash, normalize, validateCatalog } from './contracts.mjs';
import { parseLesson } from './parse-lessons.mjs';

export async function compileCatalog(root) {
  const repo = await realpath(root);
  const base = path.join(repo, 'content/ciclo-basico');
  const legacy = path.join(repo, 'content/drafts/biologia-celular-divisao-celular.md');
  const allowed = file => file.startsWith(`${base}${path.sep}`) || file === legacy;
  async function readAllowed(file) {
    if (!allowed(file)) throw new Error(`Unauthorized content path: ${file}`);
    const resolved = await realpath(file);
    if (!allowed(resolved)) throw new Error(`Unauthorized content real path: ${file}`);
    return readFile(resolved, 'utf8');
  }
  const catalog = JSON.parse(await readAllowed(path.join(base, 'catalogo.json')));
  validateCatalog(catalog);
  const lessons = [];
  for (const module of catalog.modulos) {
    const source = path.resolve(base, module.arquivo);
    const markdown = await readAllowed(source);
    for (const item of module.aulas) {
      const disciplineCode = module.id.slice(0, 2);
      const lesson = {
        editorialId: item.id,
        moduleId: module.id,
        moduleTitle: normalize(module.titulo),
        disciplineCode,
        disciplineTitle: disciplineTitles[disciplineCode],
        title: normalize(item.titulo),
        position: Number(item.id.split('-A')[1]),
        summary: normalize(module.objetivo_planejado),
        sourcePath: path.relative(repo, source).split(path.sep).join('/'),
        blocks: parseLesson(markdown, item),
      };
      lessons.push({ ...lesson, sourceHash: hash(lesson) });
    }
  }
  lessons.sort((a, b) => a.moduleId < b.moduleId ? -1 : a.moduleId > b.moduleId ? 1 : a.position - b.position);
  return { version: '0.3', digest: hash({ version: '0.3', lessons }), lessons };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--output') throw new Error('Usage: node scripts/content/compile.mjs --output <file>');
    const bundle = await compileCatalog(process.cwd());
    await writeFile(process.argv[3], `${JSON.stringify(bundle, null, 2)}\n`, { flag: 'wx' });
    console.log(`Compiled ${bundle.lessons.length} lessons; digest ${bundle.digest}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
