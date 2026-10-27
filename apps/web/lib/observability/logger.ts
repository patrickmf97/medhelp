/**
 * Structured server-side error logging, wired up by apps/web/instrumentation.ts.
 *
 * This intentionally does not bundle a paid APM SaaS. It emits a single-line
 * JSON event to stdout/stderr, which Vercel (and any other Node host)
 * collects as log output without extra configuration. See
 * docs/operations/observability.md for how to forward these events to a
 * real provider (the design spec names Sentry) once credentials exist.
 */

export interface RequestErrorInfo {
  path: string;
  method: string;
}

export interface RequestErrorContext {
  routerKind?: string;
  routePath?: string;
  routeType?: string;
  renderSource?: string;
}

export interface ServerErrorEvent {
  level: 'error';
  timestamp: string;
  message: string;
  digest?: string;
  request: RequestErrorInfo;
  context: RequestErrorContext;
}

/**
 * Defensive redaction in case an error message happens to embed a
 * credential-looking fragment (e.g. a thrown error that interpolated a
 * query string). Logs must never carry passwords, tokens or card data.
 */
function redactSensitiveValues(message: string): string {
  return message.replace(/((?:password|senha|token|bearer|secret|api[_-]?key)\s*[=:]\s*)\S+/gi, '$1[REDACTED]');
}

function readDigest(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'digest' in error) {
    const { digest } = error as { digest?: unknown };
    if (typeof digest === 'string') return digest;
  }
  return undefined;
}

export function buildServerErrorEvent(error: unknown, request: RequestErrorInfo, context: RequestErrorContext = {}): ServerErrorEvent {
  const rawMessage = error instanceof Error ? error.message : String(error);
  return {
    level: 'error',
    timestamp: new Date().toISOString(),
    message: redactSensitiveValues(rawMessage),
    digest: readDigest(error),
    request: { path: request.path, method: request.method },
    context: {
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
    },
  };
}

/**
 * Logs a server-rendering error as structured JSON and, if a provider is
 * configured, forwards it. Never throws: a failure to log must not affect
 * the request lifecycle (see design spec section 16).
 */
export async function logServerError(error: unknown, request: RequestErrorInfo, context: RequestErrorContext = {}): Promise<void> {
  const event = buildServerErrorEvent(error, request, context);

  try {
    console.error(JSON.stringify(event));
  } catch {
    // JSON.stringify should not fail for this shape, but logging must never throw.
  }

  if (process.env.SENTRY_DSN) {
    // Hook point for a real observability provider. SENTRY_DSN is read from
    // the hosting platform's protected environment variables; no SDK is
    // bundled here yet. See docs/operations/observability.md.
  }
}
