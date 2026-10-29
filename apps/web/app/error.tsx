'use client';

import { RouteErrorView } from '@/components/errors/route-error-view';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorView area="root" error={error} reset={reset} />;
}
