/**
 * Structured error logging for MedHelp.
 *
 * Two independent surfaces live in this module because they run in
 * different environments and are wired up from different places:
 *
 * - Server-side: `logServerError` / `buildServerErrorEvent`, wired up by
 *   `apps/web/instrumentation.ts` via Next.js's `onRequestError` hook.
 * - Client-side: `logClientError` / `buildClientErrorEvent`, used by the
 *   app's route `error.tsx` boundaries (apps/web/app/error.tsx and the
 *   per-area ones under aluno/, editor/, admin/ and (public)/), which are
 *   Client Components and therefore run in the browser.
 *
 * Neither bundles a paid APM SaaS yet. Each emits a single-line JSON event
 * via console.error, which is enough to debug from server logs / browser
 * devtools today and is a clear hook point for a real provider (the design
 * spec names Sentry) once credentials exist. See
 * docs/operations/observability.md for the server-side forwarding story.
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

export interface ClientErrorContext {
  /** Which area of the app caught the error, e.g. 'aluno', 'editor', 'admin', 'public', 'root'. */
  area?: string;
  /** The route segment pattern the error boundary belongs to, e.g. '/aluno/disciplinas/[id]'. */
  routePath?: string;
}

export interface ClientErrorEvent {
  level: 'error';
  timestamp: string;
  message: string;
  digest?: string;
  context: ClientErrorContext;
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

export function buildClientErrorEvent(error: unknown, context: ClientErrorContext = {}): ClientErrorEvent {
  const rawMessage = error instanceof Error ? error.message : String(error);
  return {
    level: 'error',
    timestamp: new Date().toISOString(),
    message: redactSensitiveValues(rawMessage),
    digest: readDigest(error),
    context,
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

/**
 * Logs a route error boundary's caught error as structured JSON. Never
 * throws: a failure to log must not prevent the recovery UI from
 * rendering.
 */
export function logClientError(error: unknown, context: ClientErrorContext = {}): void {
  try {
    console.error(JSON.stringify(buildClientErrorEvent(error, context)));
  } catch {
    // JSON.stringify should not fail for this shape, but logging must never throw.
  }
}
