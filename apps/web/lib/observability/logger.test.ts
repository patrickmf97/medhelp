import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildClientErrorEvent, logClientError } from './logger';

describe('buildClientErrorEvent', () => {
  it('captures the error message, area and route of a caught route error', () => {
    const event = buildClientErrorEvent(new Error('Falha ao carregar aula'), { area: 'aluno', routePath: '/aluno/disciplinas/[id]' });

    expect(event.level).toBe('error');
    expect(event.message).toBe('Falha ao carregar aula');
    expect(event.context).toEqual({ area: 'aluno', routePath: '/aluno/disciplinas/[id]' });
    expect(typeof event.timestamp).toBe('string');
  });

  it('reads the digest from errors that carry one (Next.js attaches it to server-origin errors)', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' });
    expect(buildClientErrorEvent(error).digest).toBe('abc123');
  });

  it('stringifies non-Error throwables', () => {
    const event = buildClientErrorEvent('plain string failure');
    expect(event.message).toBe('plain string failure');
  });

  it('redacts password/token-looking fragments from the message', () => {
    const event = buildClientErrorEvent(new Error('login failed for password=supersecret123'));
    expect(event.message).toBe('login failed for password=[REDACTED]');
    expect(event.message).not.toContain('supersecret123');
  });
});

describe('logClientError', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('emits a single structured JSON line', () => {
    logClientError(new Error('estado inconsistente'), { area: 'editor' });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [line] = consoleErrorSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(line);
    expect(parsed.message).toBe('estado inconsistente');
    expect(parsed.context.area).toBe('editor');
  });

  it('never throws, even if logging itself fails', () => {
    consoleErrorSpy.mockImplementation(() => {
      throw new Error('console unavailable');
    });
    expect(() => logClientError(new Error('boom'))).not.toThrow();
  });
});
