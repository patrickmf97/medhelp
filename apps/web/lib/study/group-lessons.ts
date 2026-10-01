import type { StudentLesson } from './progress-service';

interface LessonGroup {
  cycle: string;
  disciplines: { title: string; modules: { title: string; lessons: StudentLesson[] }[] }[];
}

export function groupLessons(lessons: StudentLesson[]): LessonGroup[] {
  const groups: LessonGroup[] = [];
  for (const lesson of lessons) {
    let cycle = groups.find(group => group.cycle === lesson.cycle);
    if (!cycle) { cycle = { cycle: lesson.cycle, disciplines: [] }; groups.push(cycle); }
    let discipline = cycle.disciplines.find(group => group.title === lesson.discipline);
    if (!discipline) { discipline = { title: lesson.discipline, modules: [] }; cycle.disciplines.push(discipline); }
    let moduleGroup = discipline.modules.find(group => group.title === lesson.module);
    if (!moduleGroup) { moduleGroup = { title: lesson.module, lessons: [] }; discipline.modules.push(moduleGroup); }
    moduleGroup.lessons.push(lesson);
  }
  return groups;
}
