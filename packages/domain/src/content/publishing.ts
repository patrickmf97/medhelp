import type { ContentStatus, HierarchyIntegrityInput } from './types';

const allowedTransitions: Readonly<Record<ContentStatus, readonly ContentStatus[]>> = {
  draft: ['review'],
  review: ['draft', 'published'],
  published: ['archived'],
  archived: ['draft'],
};

export function canTransitionContent(
  current: ContentStatus,
  target: ContentStatus,
): boolean {
  return allowedTransitions[current].includes(target);
}

export function transitionContent(
  current: ContentStatus,
  target: ContentStatus,
): ContentStatus {
  if (current === 'archived' && target !== 'draft') {
    throw new Error('Archived content must return to draft');
  }

  if (!canTransitionContent(current, target)) {
    throw new Error(`Invalid content transition: ${current} → ${target}`);
  }

  return target;
}

export function assertHierarchyIntegrity(input: HierarchyIntegrityInput): void {
  if (input.disciplineCycleId !== input.cycleId) {
    throw new Error('Discipline does not belong to the informed cycle');
  }

  if (input.moduleDisciplineId !== input.disciplineId) {
    throw new Error('Module does not belong to the informed discipline');
  }

  if (input.lessonModuleId !== input.moduleId) {
    throw new Error('Lesson does not belong to the informed module');
  }
}
