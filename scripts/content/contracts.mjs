import { createHash } from 'node:crypto';

export const disciplineTitles = Object.freeze({
  AN: 'Anatomia Humana', BQ: 'Bioquímica e Biofísica', CH: 'Citologia e Histologia',
  EB: 'Epidemiologia e Bioestatística', EG: 'Embriologia e Genética', FG: 'Farmacologia Geral',
  FI: 'Fisiologia', HC: 'Habilidades Médicas e Científicas', IM: 'Imunologia',
  MP: 'Microbiologia e Parasitologia', PG: 'Patologia Geral', SH: 'Saúde Coletiva e Humanidades',
});
export const normalize = text => text.replace(/\r\n?/g, '\n').normalize('NFC').trim();
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function validateCatalog(catalog) {
  if (catalog?.versao !== '0.3' || !Array.isArray(catalog.modulos)) throw new Error('Invalid catalog schema');
  const modules = new Set();
  const lessons = new Set();
  const disciplines = new Set();
  for (const module of catalog.modulos) {
    if (!/^[A-Z]{2}-\d{2}$/.test(module.id) || !disciplineTitles[module.id.slice(0, 2)]) throw new Error('Invalid module ID');
    if (modules.has(module.id)) throw new Error(`Duplicate module: ${module.id}`);
    modules.add(module.id);
    disciplines.add(module.id.slice(0, 2));
    for (const field of ['titulo', 'objetivo_planejado', 'arquivo']) {
      if (typeof module[field] !== 'string' || !module[field].trim()) throw new Error(`Invalid module ${field}`);
    }
    if (!Array.isArray(module.aulas) || !module.aulas.length) throw new Error('Empty module');
    for (const lesson of module.aulas) {
      if (!new RegExp(`^${module.id}-A[1-9][0-9]*$`).test(lesson.id)) throw new Error('Invalid lesson ID');
      if (lessons.has(lesson.id)) throw new Error(`Duplicate lesson: ${lesson.id}`);
      lessons.add(lesson.id);
      if (typeof lesson.titulo !== 'string' || !lesson.titulo.trim()) throw new Error('Invalid lesson title');
      if (lesson.secao_original && !(module.id === 'EG-01' && lesson.secao_original === `Aula ${lesson.id.split('-A')[1]}`)) throw new Error('Invalid legacy section');
    }
  }
  if (modules.size !== 72 || lessons.size !== 83 || disciplines.size !== 12) throw new Error('Invalid catalog counts: expected 72 modules, 83 lessons, 12 disciplines');
}
