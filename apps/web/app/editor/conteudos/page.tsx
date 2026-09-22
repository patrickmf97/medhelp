import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { listEditorialLessons } from '@/lib/content/repository';

const statusLabel = {
  draft: 'Rascunho',
  review: 'Em revisão',
  published: 'Publicado',
  archived: 'Arquivado',
} as const;

export default async function EditorialCatalogPage() {
  const lessons = await listEditorialLessons();

  return (
    <section className="editor-page">
      <header className="editor-page__header">
        <div><span className="eyebrow">Catálogo acadêmico</span><h1>Conteúdos</h1><p>Organize, revise, agende e publique aulas com rastreabilidade.</p></div>
        <Link className={buttonClassName('primary')} href="/editor/conteudos/novo">Nova aula</Link>
      </header>
      {lessons.length === 0 ? (
        <div className="empty-state"><span aria-hidden="true">▤</span><h2>Nenhuma aula criada</h2><p>Crie a primeira aula quando a hierarquia acadêmica estiver configurada.</p></div>
      ) : (
        <div className="content-table-wrap">
          <table className="content-table">
            <thead><tr><th>Aula</th><th>Hierarquia</th><th>Acesso</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>
              {lessons.map((lesson) => <tr key={lesson.id}>
                <td><strong>{lesson.title}</strong><small>/{lesson.slug}</small></td>
                <td>{lesson.modules?.disciplines?.cycles?.title} · {lesson.modules?.disciplines?.title} · {lesson.modules?.title}</td>
                <td>{lesson.access_level === 'premium' ? 'Premium' : 'Gratuito'}</td>
                <td><Badge>{statusLabel[lesson.status]}</Badge></td>
                <td><Link className="table-link" href={`/editor/conteudos/${lesson.id}`}>Editar</Link></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
