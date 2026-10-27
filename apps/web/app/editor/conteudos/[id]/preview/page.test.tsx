import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LessonPreviewPage from './page';

afterEach(cleanup);

const lesson = {
  id: 'lesson-1',
  title: 'Insuficiência cardíaca',
  access_level: 'premium',
  modules: { title: 'Módulo', disciplines: { title: 'Disciplina', cycles: { title: 'Ciclo' } } },
};

vi.mock('@/lib/content/repository', () => ({
  getEditorialLesson: vi.fn(async () => lesson),
  getEditorialLessonBlocks: vi.fn(async () => []),
}));

describe('editorial lesson preview', () => {
  it('renders the actual published blocks instead of only a placeholder', async () => {
    const { getEditorialLessonBlocks } = await import('@/lib/content/repository');
    vi.mocked(getEditorialLessonBlocks).mockResolvedValue([
      { id: 'b1', block_type: 'heading', content: { text: 'Fisiopatologia' }, position: 0 },
      { id: 'b2', block_type: 'rich_text', content: { text: 'Texto revisado da aula.' }, position: 1 },
    ]);

    render(await LessonPreviewPage({ params: Promise.resolve({ id: 'lesson-1' }) }));

    expect(screen.getByRole('heading', { name: 'Fisiopatologia' })).toBeInTheDocument();
    expect(screen.getByText('Texto revisado da aula.')).toBeInTheDocument();
    expect(screen.queryByText('Blocos de texto, mídia, resumos e materiais aparecerão aqui.')).toBeNull();
  });

  it('keeps the preparation notice when the lesson has no blocks yet', async () => {
    const { getEditorialLessonBlocks } = await import('@/lib/content/repository');
    vi.mocked(getEditorialLessonBlocks).mockResolvedValue([]);

    render(await LessonPreviewPage({ params: Promise.resolve({ id: 'lesson-1' }) }));

    expect(screen.getByText('Blocos de texto, mídia, resumos e materiais aparecerão aqui.')).toBeInTheDocument();
  });
});
