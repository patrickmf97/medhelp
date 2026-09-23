import type { Metadata } from 'next';

import { ContentExplorer, type CatalogStatus } from '@/components/public/content-explorer';
import { listPublicCatalog, type PublicCatalogItem } from '@/lib/content/public-catalog';

export const metadata: Metadata = {
  title: 'Explorar conteúdos',
  description: 'Conheça os conteúdos gratuitos e premium organizados por ciclo, disciplina e módulo na MEDHELP.',
};

export default async function ExplorePage() {
  let items: PublicCatalogItem[] = [];
  let status: CatalogStatus = 'empty';

  try {
    items = await listPublicCatalog();
    status = items.length > 0 ? 'ready' : 'empty';
  } catch {
    status = 'unavailable';
  }

  return (
    <div className="explore-page">
      <section className="explore-hero">
        <div className="container">
          <span className="eyebrow">Conteúdo público MEDHELP</span>
          <h1>Encontre clareza antes de encontrar mais conteúdo.</h1>
          <p>Explore o catálogo por etapa da formação, disciplina e nível de acesso. Tudo o que aparece aqui respeita o fluxo editorial de publicação.</p>
          <div className="explore-hero__trail" aria-label="Organização do catálogo">
            <span>Ciclo</span><i aria-hidden="true">→</i><span>Disciplina</span><i aria-hidden="true">→</i><span>Módulo</span><i aria-hidden="true">→</i><span>Aula</span>
          </div>
        </div>
      </section>
      <section className="section explore-catalog" aria-labelledby="catalog-title">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Catálogo em evolução</span>
            <h2 id="catalog-title">Conteúdos publicados</h2>
            <p>Use a busca e os filtros para chegar ao próximo tema com menos atrito.</p>
          </div>
          <ContentExplorer items={items} status={status} />
        </div>
      </section>
    </div>
  );
}
