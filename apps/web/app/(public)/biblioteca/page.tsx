import { Badge } from '@medhelp/ui';
import type { Metadata } from 'next';

import { EbookDownloadButton } from '@/components/public/ebook-download-button';
import { listEbookCatalog, type PublicEbook } from '@/lib/content/ebook-catalog';

export const metadata: Metadata = {
  title: 'Biblioteca',
  description: 'Ebooks acadêmicos com origem e licenciamento verificados para a sua formação médica.',
};

type CatalogStatus = 'ready' | 'empty' | 'unavailable';

export default async function LibraryPage() {
  let ebooks: PublicEbook[] = [];
  let status: CatalogStatus = 'empty';

  try {
    ebooks = await listEbookCatalog();
    status = ebooks.length > 0 ? 'ready' : 'empty';
  } catch {
    status = 'unavailable';
  }

  return (
    <div className="library-page">
      <section className="explore-hero">
        <div className="container">
          <span className="eyebrow">Biblioteca acadêmica</span>
          <h1>Materiais com origem e licenciamento verificados.</h1>
          <p>Cada ebook aqui tem autor, fonte e licença conferidos antes da publicação — nada entra na biblioteca sem essa checagem.</p>
        </div>
      </section>
      <section className="section library-catalog" aria-labelledby="library-title">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Acervo em evolução</span>
            <h2 id="library-title">Ebooks publicados</h2>
          </div>
          {status === 'unavailable' && (
            <p className="student-empty" role="status">
              Não foi possível carregar a biblioteca agora. Tente novamente em alguns instantes.
            </p>
          )}
          {status === 'empty' && (
            <div className="student-empty student-empty--wide">
              <span aria-hidden="true">✧</span>
              <h3>A biblioteca aparecerá aqui.</h3>
              <p>Assim que os primeiros materiais forem publicados, você poderá consultá-los nesta página.</p>
            </div>
          )}
          {status === 'ready' && (
            <ul className="library-grid">
              {ebooks.map((ebook) => (
                <li className="ebook-card" key={ebook.id}>
                  <div className="ebook-card__head">
                    <Badge>{ebook.accessLevel === 'premium' ? 'Premium' : 'Gratuito'}</Badge>
                  </div>
                  <h3>{ebook.title}</h3>
                  <p className="ebook-card__author">{ebook.author}</p>
                  {ebook.description && <p>{ebook.description}</p>}
                  <p className="ebook-card__source">Fonte: {ebook.source}</p>
                  {ebook.licenseUrl && (
                    <a href={ebook.licenseUrl} rel="noopener noreferrer" target="_blank">Ver licença ↗</a>
                  )}
                  <EbookDownloadButton ebookId={ebook.id} title={ebook.title} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
