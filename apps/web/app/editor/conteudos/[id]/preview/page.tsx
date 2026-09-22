import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEditorialLesson } from '@/lib/content/repository';

export default async function LessonPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = await getEditorialLesson(id);
  if (!lesson) notFound();

  return <article className="lesson-preview">
    <header>
      <div><span className="eyebrow">Prévia editorial</span><h1>{lesson.title}</h1><p>{lesson.modules?.disciplines?.cycles?.title} · {lesson.modules?.disciplines?.title} · {lesson.modules?.title}</p></div>
      <Badge>{lesson.access_level === 'premium' ? 'Premium' : 'Gratuito'}</Badge>
    </header>
    <div className="lesson-preview__body">
      <p>{lesson.summary || 'Adicione um resumo para apresentar esta aula aos estudantes.'}</p>
      <div className="lesson-preview__placeholder"><span aria-hidden="true">✚</span><strong>Conteúdo da aula</strong><small>Blocos de texto, mídia, resumos e materiais aparecerão aqui.</small></div>
    </div>
    <Link className={buttonClassName('secondary')} href={`/editor/conteudos/${id}`}>Voltar ao editor</Link>
  </article>;
}
