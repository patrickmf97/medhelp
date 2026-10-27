import { RouteNotFoundView } from '@/components/errors/route-not-found-view';

export default function EditorNotFound() {
  return (
    <RouteNotFoundView
      description="Este conteúdo pode ter sido removido. Volte para a lista de conteúdos."
      homeHref="/editor/conteudos"
      homeLabel="Voltar aos conteúdos"
      title="Não encontramos este conteúdo."
    />
  );
}
