import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LessonForm } from '@/components/editor/lesson-form';
import { MediaUploader } from '@/components/editor/media-uploader';
import { getEditorialLesson, listCatalogOptions } from '@/lib/content/repository';
import { transitionLessonAction, updateLessonAction } from '../actions';

const statusLabel = { draft: 'Rascunho', review: 'Em revisão', published: 'Publicado', archived: 'Arquivado' } as const;
const nextActions = {
  draft: [{ target: 'review', label: 'Enviar para revisão' }],
  review: [{ target: 'draft', label: 'Devolver a rascunho' }, { target: 'published', label: 'Publicar' }],
  published: [{ target: 'archived', label: 'Arquivar' }],
  archived: [{ target: 'draft', label: 'Restaurar como rascunho' }],
} as const;

export default async function EditLessonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const { id } = await params;
  const [lesson, modules, query] = await Promise.all([getEditorialLesson(id), listCatalogOptions(), searchParams]);
  if (!lesson) notFound();
  const updateAction = updateLessonAction.bind(null, id);

  return <section className="editor-page editor-page--narrow">
    <Link className="back-link" href="/editor/conteudos">← Voltar ao catálogo</Link>
    <header className="editor-page__header"><div><span className="eyebrow">Editor de aula</span><h1>{lesson.title}</h1><p>{lesson.modules?.disciplines?.cycles?.title} · {lesson.modules?.disciplines?.title} · {lesson.modules?.title}</p></div><Badge>{statusLabel[lesson.status]}</Badge></header>
    {query.salvo ? <p className="editor-notice" role="status">Alterações salvas.</p> : null}
    <div className="editor-toolbar">
      <Link className={buttonClassName('secondary')} href={`/editor/conteudos/${id}/preview`}>Visualizar</Link>
      {nextActions[lesson.status].map((item) => {
        const action = transitionLessonAction.bind(null, id, item.target);
        return <form action={action} key={item.target}><button className={buttonClassName(item.target === 'published' ? 'primary' : 'secondary')} type="submit">{item.label}</button></form>;
      })}
    </div>
    <LessonForm action={updateAction} lesson={lesson} modules={modules} />
    <section className="editor-panel"><h2>Mídia e anexos</h2><p>Envios usam uma URL temporária e não passam pelo servidor da aplicação.</p><MediaUploader lessonId={id} /></section>
  </section>;
}
