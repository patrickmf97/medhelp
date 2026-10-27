'use client';

import { buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { useEffect } from 'react';
import { logClientError } from '@/lib/observability/logger';

export interface RouteErrorViewProps {
  /** The error Next.js caught in this route segment's boundary. */
  error: Error & { digest?: string };
  /** Next.js' error-boundary reset callback: attempts to re-render the segment. */
  reset: () => void;
  /** Which part of the app this boundary belongs to, used only for the log event. */
  area: string;
  homeHref?: string;
  homeLabel?: string;
  title?: string;
  description?: string;
}

/**
 * Minimal, accessible recovery UI shared by every route-level `error.tsx`
 * boundary. Reports the caught error through the observability logger and
 * offers a retry (Next.js' `reset()`) plus a way back home.
 */
export function RouteErrorView({
  error,
  reset,
  area,
  homeHref = '/',
  homeLabel = 'Voltar ao início',
  title = 'Algo não funcionou como esperado.',
  description = 'Tente novamente. Se o problema continuar, volte para a página inicial.',
}: RouteErrorViewProps) {
  useEffect(() => {
    logClientError(error, { area });
  }, [error, area]);

  return (
    <section className="route-error" role="alert">
      <span aria-hidden="true">⚠</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="route-error__actions">
        <button className={buttonClassName('primary')} onClick={reset} type="button">Tentar novamente</button>
        <Link className={buttonClassName('secondary')} href={homeHref}>{homeLabel}</Link>
      </div>
    </section>
  );
}
