import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FlashcardSession } from './flashcard-session';

const submit = vi.fn().mockResolvedValue({ dueAt: '2026-09-28T12:00:00Z' });
vi.mock('./actions', () => ({ reviewAction: (...args: unknown[]) => submit(...args) }));

afterEach(() => { cleanup(); submit.mockClear(); });

describe('FlashcardSession', () => {
  const cards = [{ id: '11111111-1111-4111-8111-111111111111', deck_id: 'deck', deckTitle: 'Fisiologia', front: 'O que é homeostase?', back: 'Equilíbrio interno.', explanation: 'Regulação do meio interno.', position: 0, isNew: true }];

  it('shows the answer only after reveal, then records the selected grade', async () => {
    render(<FlashcardSession cards={cards} />);
    expect(screen.queryByText('Equilíbrio interno.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar resposta' }));
    expect(screen.getByText('Equilíbrio interno.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Fácil/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(cards[0]!.id, 'easy', expect.any(String)));
    await waitFor(() => expect(screen.getByText('Revisão de hoje concluída')).toBeVisible());
  });

  it('supports Space to reveal and numeric shortcuts after reveal', async () => {
    render(<FlashcardSession cards={cards} />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByText('Equilíbrio interno.')).toBeVisible();
    fireEvent.keyDown(window, { key: '1' });
    await waitFor(() => expect(submit).toHaveBeenCalledWith(cards[0]!.id, 'again', expect.any(String)));
  });

  it('keeps the next card when the server refreshes the queue after a review', async () => {
    const second = { ...cards[0]!, id: '22222222-2222-4222-8222-222222222222', front: 'Qual é o próximo tema?', back: 'Revisão.' };
    const view = render(<FlashcardSession cards={[cards[0]!, second]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar resposta' }));
    fireEvent.click(screen.getByRole('button', { name: /Fácil/ }));
    await waitFor(() => expect(screen.getByText('Qual é o próximo tema?')).toBeVisible());
    view.rerender(<FlashcardSession cards={[second]} />);
    expect(screen.getByText('Qual é o próximo tema?')).toBeVisible();
    expect(screen.queryByText('Revisão de hoje concluída')).toBeNull();
  });
});
