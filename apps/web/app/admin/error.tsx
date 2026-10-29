'use client';

import { RouteErrorView } from '@/components/errors/route-error-view';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorView
      area="admin"
      description="Tente novamente. Se o problema continuar, volte para a visão geral do painel."
      error={error}
      homeHref="/admin"
      reset={reset}
      title="Não foi possível carregar o painel administrativo."
    />
  );
}
