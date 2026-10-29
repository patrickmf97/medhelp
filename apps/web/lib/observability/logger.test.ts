import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildClientErrorEvent, buildServerErrorEvent, logClientError, logServerError } from './logger';

describe('buildServerErrorEvent', () => {
  it('captures the error message, request path/method and router context', () => {
    const event = buildServerErrorEvent(
      new Error('Falha ao carregar aula'),
      { path: '/explorar/aula/123', method: 'GET' },
      { routerKind: 'App Router', routePath: '/explorar/aula/[id]', routeType: 'render' },
    );

    expect(event.level).toBe('error');
    expect(event.message).toBe('Falha ao carregar aula');
    expect(event.request).toEqual({ path: '/explorar/aula/123', method: 'GET' });
    expect(event.context.routerKind).toBe('App Router');
    expect(event.context.routePath).toBe('/explorar/aula/[id]');
    expect(typeof event.timestamp).toBe('string');
  });

  it('reads the digest from errors that carry one', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' });
    expect(buildServerErrorEvent(error, { path: '/', method: 'GET' }).digest).toBe('abc123');
  });

  it('stringifies non-Error throwables', () => {
    const event = buildServerErrorEvent('plain string failure', { path: '/', method: 'POST' });
    expect(event.message).toBe('plain string failure');
  });

  it('redacts password/token-looking fragments from the message', () => {
    const event = buildServerErrorEvent(new Error('login failed for password=supersecret123'), { path: '/entrar', method: 'POST' });
    expect(event.message).toBe('login failed for password=[REDACTED]');
    expect(event.message).not.toContain('supersecret123');
  });
});

describe('logServerError', () => {
  const originalDsn = process.env.SENTRY_DSN;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.SENTRY_DSN;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    if (originalDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalDsn;
  });

  it('emits a single structured JSON line to stderr', async () => {
    await logServerError(new Error('database timeout'), { path: '/aluno', method: 'GET' }, { routeType: 'render' });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [line] = consoleErrorSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(line);
    expect(parsed.message).toBe('database timeout');
    expect(parsed.request.path).toBe('/aluno');
  });

  it('never throws, even if logging itself fails', async () => {
    consoleErrorSpy.mockImplementation(() => {
      throw new Error('stdout closed');
    });
    await expect(logServerError(new Error('boom'), { path: '/', method: 'GET' })).resolves.toBeUndefined();
  });
});

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
