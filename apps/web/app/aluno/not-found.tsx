import { RouteNotFoundView } from '@/components/errors/route-not-found-view';

export default function AlunoNotFound() {
  return (
    <RouteNotFoundView
      description="O conteúdo pode ter sido despublicado ou o endereço está incorreto."
      homeHref="/aluno/disciplinas"
      homeLabel="Ver disciplinas"
      title="Não encontramos esta aula ou página."
    />
  );
}
