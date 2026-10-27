import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EditorError from './error';

describe('editor error boundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => consoleErrorSpy.mockRestore());

  it('renders recovery UI scoped to the editorial area with a working retry button', () => {
    const reset = vi.fn();
    render(<EditorError error={new Error('falha ao salvar conteúdo')} reset={reset} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    screen.getByRole('button', { name: /tentar novamente/i }).click();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /conteúdos/i })).toHaveAttribute('href', '/editor/conteudos');
  });
});
