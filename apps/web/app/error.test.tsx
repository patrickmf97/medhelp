import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GlobalError from './error';

describe('root error boundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => consoleErrorSpy.mockRestore());

  it('renders recovery UI with a working retry button and a link home', () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error('falha inesperada')} reset={reset} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    screen.getByRole('button', { name: /tentar novamente/i }).click();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /início/i })).toHaveAttribute('href', '/');
  });
});
