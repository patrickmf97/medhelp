import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireUser } from '@/lib/auth/require-role';
import { saveLessonProgress } from './student-service';

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
