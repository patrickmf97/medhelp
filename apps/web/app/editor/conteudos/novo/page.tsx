import Link from 'next/link';
import { LessonForm } from '@/components/editor/lesson-form';
import { listCatalogOptions } from '@/lib/content/repository';
import { createLessonAction } from '../actions';

export default async function NewLessonPage() {
  const modules = await listCatalogOptions();
  return <section className="editor-page editor-page--narrow">
    <Link className="back-link" href="/editor/conteudos">← Voltar ao catálogo</Link>
    <header className="editor-page__header"><div><span className="eyebrow">Nova aula</span><h1>Criar conteúdo</h1><p>Comece em rascunho e encaminhe para revisão quando estiver pronto.</p></div></header>
    <LessonForm action={createLessonAction} modules={modules} />
  </section>;
}
