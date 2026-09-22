import { describe, expect, it } from 'vitest';

import {
  assertHierarchyIntegrity,
  canTransitionContent,
  transitionContent,
} from './publishing';

describe('content publishing workflow', () => {
  it.each([
    ['draft', 'review'],
    ['review', 'draft'],
    ['review', 'published'],
    ['published', 'archived'],
    ['archived', 'draft'],
  ] as const)('allows %s → %s', (current, target) => {
    expect(canTransitionContent(current, target)).toBe(true);
    expect(transitionContent(current, target)).toBe(target);
  });

  it.each([
    ['draft', 'published'],
    ['draft', 'archived'],
    ['review', 'archived'],
    ['published', 'draft'],
  ] as const)('rejects %s → %s', (current, target) => {
    expect(canTransitionContent(current, target)).toBe(false);
    expect(() => transitionContent(current, target)).toThrow(
      `Invalid content transition: ${current} → ${target}`,
    );
  });

  it('requires archived content to return to draft', () => {
    expect(() => transitionContent('archived', 'published')).toThrow(
      'Archived content must return to draft',
    );
  });

  it('accepts a complete cycle → discipline → module → lesson hierarchy', () => {
    expect(() =>
      assertHierarchyIntegrity({
        cycleId: 'cycle-clinico',
        disciplineCycleId: 'cycle-clinico',
        disciplineId: 'cardiologia',
        moduleDisciplineId: 'cardiologia',
        moduleId: 'insuficiencia-cardiaca',
        lessonModuleId: 'insuficiencia-cardiaca',
      }),
    ).not.toThrow();
  });

  it('rejects a lesson connected to a module from another hierarchy', () => {
    expect(() =>
      assertHierarchyIntegrity({
        cycleId: 'cycle-clinico',
        disciplineCycleId: 'cycle-clinico',
        disciplineId: 'cardiologia',
        moduleDisciplineId: 'cardiologia',
        moduleId: 'insuficiencia-cardiaca',
        lessonModuleId: 'semiologia',
      }),
    ).toThrow('Lesson does not belong to the informed module');
  });
});
