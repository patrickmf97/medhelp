import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireUser } from '@/lib/auth/require-role';
import { getStudentLesson, saveLessonProgress } from './student-service';

vi.mock('@/lib/auth/require-role', () => ({ requireUser: vi.fn() }));

describe('saving lesson progress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects invalid time positions before touching the database', async () => {
    await expect(saveLessonProgress({ lessonId: 'x', seconds: -1, complete: false })).rejects.toThrow('Progresso inválido');
    expect(requireUser).not.toHaveBeenCalled();
  });

  it('writes the authenticated student identity and a published free lesson', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const lessonQuery = {
      select: vi.fn(() => lessonQuery), eq: vi.fn(() => lessonQuery), is: vi.fn(() => lessonQuery),
      lte: vi.fn(() => lessonQuery), maybeSingle: vi.fn(async () => ({ data: { id: '11111111-1111-4111-8111-111111111111', access_level: 'free' }, error: null })),
    };
    const supabase = { from: vi.fn((table: string) => table === 'lessons' ? lessonQuery : { upsert }) };
    vi.mocked(requireUser).mockResolvedValue({ user: { id: 'student-1' }, supabase } as never);

    await saveLessonProgress({ lessonId: '11111111-1111-4111-8111-111111111111', seconds: 42, complete: false });
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'student-1', lesson_id: '11111111-1111-4111-8111-111111111111', seconds: 42, completed_at: null },
      { onConflict: 'user_id,lesson_id' },
    );
  });
});

describe('reading lessons', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  function client(access: 'free' | 'premium') {
    const tables: Record<string, unknown> = {
      lessons: { id, title: 'Membrana', slug: 'ch-01-a1', summary: 'Introdução', access_level: access, modules: { title: 'Transporte', disciplines: { title: 'Citologia', cycles: { title: 'Básico', slug: 'basico' } } } },
      subscriptions: { state: 'expired', access_until: '2020-01-01T00:00:00Z' },
      access_grants: [],
      lesson_progress: { lesson_id: id, seconds: 42, completed_at: null, last_studied_at: '2020-01-01T00:00:00Z' },
      favorites: { lesson_id: id },
      lesson_blocks: [
        { id: 'b1', block_type: 'rich_text', content: { text: '**Texto**', format: 'medhelp-markdown-v1' }, position: 0 },
        { id: 'b2', block_type: 'rich_text', content: { text: '**Antigo**' }, position: 1 },
      ],
    };
    const from = vi.fn((table: string) => {
      const result = { data: tables[table], error: null };
      const query = {
        select: () => query, eq: () => query, is: () => query, lte: () => query,
        order: async () => result, maybeSingle: async () => result,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    });
    vi.mocked(requireUser).mockResolvedValue({ user: { id: 'student' }, supabase: { from } } as never);
    return from;
  }
  it('passes only recognized formatting through the reader', async () => {
    client('free');
    const result = await getStudentLesson(id);
    expect(result?.lesson.module).toBe('Transporte');
    expect(result?.blocks[0]?.format).toBe('medhelp-markdown-v1');
    expect(result?.blocks[1]?.format).toBeNull();
  });
  it('does not request premium blocks after expiry and retains learning state', async () => {
    const from = client('premium');
    const result = await getStudentLesson(id);
    expect(result?.locked).toBe(true);
    expect(result?.blocks).toEqual([]);
    expect(result?.progress?.seconds).toBe(42);
    expect(result?.favorite).toBe(true);
    expect(from).not.toHaveBeenCalledWith('lesson_blocks');
  });
});
