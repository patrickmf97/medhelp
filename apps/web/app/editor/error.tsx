'use client';

import { RouteErrorView } from '@/components/errors/route-error-view';

export default function EditorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorView
      area="editor"
      description="Tente novamente. Se o problema continuar, volte para a lista de conteúdos."
      error={error}
      homeHref="/editor/conteudos"
      homeLabel="Voltar aos conteúdos"
      reset={reset}
      title="Não foi possível concluir esta ação editorial."
    />
  );
}
