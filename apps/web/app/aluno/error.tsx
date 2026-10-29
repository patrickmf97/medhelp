'use client';

import { RouteErrorView } from '@/components/errors/route-error-view';

export default function AlunoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorView
      area="aluno"
      description="Tente novamente. Se o problema continuar, volte para o início da sua área de estudos."
      error={error}
      homeHref="/aluno"
      reset={reset}
      title="Não foi possível carregar esta página."
    />
  );
}
