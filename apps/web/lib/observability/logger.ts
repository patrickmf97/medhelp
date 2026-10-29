/**
 * Structured client-side error logging, used by the app's route `error.tsx`
 * boundaries (apps/web/app/error.tsx and the per-area ones under aluno/,
 * editor/, admin/ and (public)/).
 *
 * Next.js error boundaries are Client Components, so this runs in the
 * browser. It intentionally does not bundle a paid APM SaaS: it emits a
 * single-line JSON event via console.error, which is enough to debug from
 * browser devtools today and is a clear hook point for a real provider
 * (e.g. Sentry) later without inventing a credential now.
 */

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
