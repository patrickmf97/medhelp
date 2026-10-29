import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PublicError from './error';

describe('public error boundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => consoleErrorSpy.mockRestore());

  it('renders recovery UI with a working retry button and a link home', () => {
    const reset = vi.fn();
    render(<PublicError error={new Error('falha ao carregar página')} reset={reset} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    screen.getByRole('button', { name: /tentar novamente/i }).click();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /início/i })).toHaveAttribute('href', '/');
  });
});
