import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AlunoError from './error';

describe('aluno error boundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => consoleErrorSpy.mockRestore());

  it('renders recovery UI scoped to the student area with a working retry button', () => {
    const reset = vi.fn();
    render(<AlunoError error={new Error('falha ao carregar aula')} reset={reset} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    screen.getByRole('button', { name: /tentar novamente/i }).click();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /início/i })).toHaveAttribute('href', '/aluno');
  });
});
