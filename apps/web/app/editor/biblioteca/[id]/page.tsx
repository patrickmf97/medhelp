import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EbookForm } from '@/components/editor/ebook-form';
import { getEditorialEbook } from '@/lib/content/ebook-repository';
import { transitionEbookAction, updateEbookAction } from '../actions';

const statusLabel = { draft: 'Rascunho', review: 'Em revisão', published: 'Publicado', archived: 'Arquivado' } as const;
const nextActions = {
  draft: [{ target: 'review', label: 'Enviar para revisão' }],
  review: [{ target: 'draft', label: 'Devolver a rascunho' }, { target: 'published', label: 'Publicar' }],
  published: [{ target: 'archived', label: 'Arquivar' }],
  archived: [{ target: 'draft', label: 'Restaurar como rascunho' }],
} as const;

export default async function EditEbookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const { id } = await params;
  const [ebook, query] = await Promise.all([getEditorialEbook(id), searchParams]);
  if (!ebook) notFound();
  const updateAction = updateEbookAction.bind(null, id);

  return <section className="editor-page editor-page--narrow">
    <Link className="back-link" href="/editor/biblioteca">← Voltar à biblioteca</Link>
    <header className="editor-page__header"><div><span className="eyebrow">Editor de ebook</span><h1>{ebook.title}</h1><p>{ebook.author}</p></div><Badge>{statusLabel[ebook.status]}</Badge></header>
    {query.salvo ? <p className="editor-notice" role="status">Alterações salvas.</p> : null}
    <div className="editor-toolbar">
      {nextActions[ebook.status].map((item) => {
        const action = transitionEbookAction.bind(null, id, item.target);
        return <form action={action} key={item.target}><button className={buttonClassName(item.target === 'published' ? 'primary' : 'secondary')} type="submit">{item.label}</button></form>;
      })}
    </div>
    <EbookForm action={updateAction} ebook={ebook} />
  </section>;
}
