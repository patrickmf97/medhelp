import type { Instrumentation } from 'next';

import { logServerError } from '@/lib/observability/logger';

/**
 * Called once when a new Next.js server instance starts. There is no
 * tracing/APM SDK registered yet (see docs/operations/observability.md for
 * how to wire one up); this is the designated place to call
 * `registerOTel(...)` or an equivalent provider bootstrap once credentials
 * exist.
 */
export function register(): void {}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await logServerError(
    error,
    { path: request.path, method: request.method },
    { routerKind: context.routerKind, routePath: context.routePath, routeType: context.routeType, renderSource: context.renderSource },
  );
};
