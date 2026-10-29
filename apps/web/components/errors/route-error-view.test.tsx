import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logClientError } from '@/lib/observability/logger';
import { RouteErrorView } from './route-error-view';

vi.mock('@/lib/observability/logger', () => ({ logClientError: vi.fn() }));

describe('RouteErrorView', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // React 19 logs the boundary error to console.error during tests; keep output clean.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => consoleErrorSpy.mockRestore());

  it('renders accessible recovery UI with a retry action wired to reset()', () => {
    const reset = vi.fn();
    render(<RouteErrorView area="aluno" error={new Error('falha ao carregar aula')} reset={reset} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /tentar novamente/i });
    retry.click();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument();
  });

  it('reports the caught error through the observability logger with its area', () => {
    const error = new Error('falha ao carregar aula');
    render(<RouteErrorView area="editor" error={error} reset={() => {}} />);

    expect(logClientError).toHaveBeenCalledWith(error, { area: 'editor' });
  });

  it('accepts a custom home destination and label', () => {
    render(<RouteErrorView area="admin" error={new Error('boom')} homeHref="/admin" homeLabel="Voltar ao painel" reset={() => {}} />);
    expect(screen.getByRole('link', { name: 'Voltar ao painel' })).toHaveAttribute('href', '/admin');
  });
});
