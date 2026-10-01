import { expect, it } from 'vitest';
import { groupLessons } from './group-lessons';
import type { StudentLesson } from './progress-service';

it('groups by full hierarchy and preserves received lesson order', () => {
  const lesson = (id: string, discipline: string, module: string, cycle = 'Básico'): StudentLesson => ({ id, title: id, discipline, module, cycle, accessLevel: 'premium' });
  const groups = groupLessons([lesson('a2', 'Anatomia', 'Introdução'), lesson('b1', 'Fisiologia', 'Introdução'), lesson('a1', 'Anatomia', 'Introdução'), lesson('c', 'Anatomia', 'Introdução', 'Clínico')]);
  expect(groups.map(x => x.cycle)).toEqual(['Básico', 'Clínico']);
  expect(groups[0]?.disciplines.map(x => x.title)).toEqual(['Anatomia', 'Fisiologia']);
  expect(groups[0]?.disciplines[0]?.modules[0]?.lessons.map(x => x.id)).toEqual(['a2', 'a1']);
  expect(groups[0]?.disciplines[1]?.modules[0]?.lessons.map(x => x.id)).toEqual(['b1']);
  expect(groupLessons([])).toEqual([]);
});
