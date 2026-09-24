import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonControls } from './lesson-controls';

const saveProgress = vi.fn();
const toggleFavorite = vi.fn();
vi.mock('./actions', () => ({ saveProgressAction: (...args: unknown[]) => saveProgress(...args), toggleFavoriteAction: (...args: unknown[]) => toggleFavorite(...args) }));

describe('LessonControls', () => {
  afterEach(cleanup);
  beforeEach(() => { saveProgress.mockReset().mockResolvedValue(undefined); toggleFavorite.mockReset().mockResolvedValue(undefined); });

  it('marks completion, saves it, and prevents another completion request', async () => {
    render(<LessonControls lessonId="lesson-id" initialSeconds={120} initiallyComplete={false} initiallyFavorite={false} videoUrl={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como concluída' }));
    await waitFor(() => expect(saveProgress).toHaveBeenCalledWith('lesson-id', 120, true));
    await waitFor(() => expect(screen.getByRole('button', { name: '✓ Aula concluída' })).toBeDisabled());
  });

  it('saves a favorite and reflects the new state', async () => {
    render(<LessonControls lessonId="lesson-id" initialSeconds={0} initiallyComplete={false} initiallyFavorite={false} videoUrl={null} />);
    fireEvent.click(screen.getByRole('button', { name: '♡ Salvar aula' }));
    await waitFor(() => expect(toggleFavorite).toHaveBeenCalledWith('lesson-id', true));
    await waitFor(() => expect(screen.getByRole('button', { name: '♥ Salva' })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('flushes the latest video position when leaving during a scheduled save', () => {
    const request = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', request);
    const view = render(<LessonControls lessonId="lesson-id" initialSeconds={0} initiallyComplete={false} initiallyFavorite={false} videoUrl="https://example.test/video.mp4" />);
    const video = view.container.querySelector('video')!;
    video.currentTime = 15;
    fireEvent.timeUpdate(video);
    view.unmount();
    expect(request).toHaveBeenCalledWith('/aluno/disciplinas/lesson-id/progress', expect.objectContaining({
      keepalive: true, method: 'POST', body: JSON.stringify({ seconds: 15, complete: false }),
    }));
    vi.unstubAllGlobals();
  });
});
