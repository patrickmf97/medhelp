import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { listEditorialEbooks } from '@/lib/content/ebook-repository';

const statusLabel = {
  draft: 'Rascunho',
  review: 'Em revisão',
  published: 'Publicado',
  archived: 'Arquivado',
} as const;

export default async function EditorialEbookLibraryPage() {
  const ebooks = await listEditorialEbooks();

  return (
    <section className="editor-page">
      <header className="editor-page__header">
        <div>
          <span className="eyebrow">Biblioteca acadêmica</span>
          <h1>Ebooks</h1>
          <p>Cadastre e publique materiais com os metadados de direitos exigidos antes da publicação.</p>
        </div>
        <Link className={buttonClassName('primary')} href="/editor/biblioteca/novo">Novo ebook</Link>
      </header>
      {ebooks.length === 0 ? (
        <div className="empty-state"><span aria-hidden="true">▤</span><h2>Nenhum ebook cadastrado</h2><p>Cadastre o primeiro material da biblioteca.</p></div>
      ) : (
        <div className="content-table-wrap">
          <table className="content-table">
            <thead><tr><th>Ebook</th><th>Autor</th><th>Acesso</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>
              {ebooks.map((ebook) => <tr key={ebook.id}>
                <td><strong>{ebook.title}</strong><small>/{ebook.slug}</small></td>
                <td>{ebook.author}</td>
                <td>{ebook.access_level === 'premium' ? 'Premium' : 'Gratuito'}</td>
                <td><Badge>{statusLabel[ebook.status]}</Badge></td>
                <td><Link className="table-link" href={`/editor/biblioteca/${ebook.id}`}>Editar</Link></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
