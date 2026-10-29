'use client';

import { RouteErrorView } from '@/components/errors/route-error-view';

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorView area="public" error={error} reset={reset} />;
}
