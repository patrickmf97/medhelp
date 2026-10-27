import { Badge, buttonClassName } from '@medhelp/ui';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LessonText } from '@/components/study/lesson-text';
import { getEditorialLesson, getEditorialLessonBlocks } from '@/lib/content/repository';
import { mapLessonBlocks } from '@/lib/study/student-service';

export default async function LessonPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lesson, blockRows] = await Promise.all([getEditorialLesson(id), getEditorialLessonBlocks(id)]);
  if (!lesson) notFound();
  const blocks = mapLessonBlocks(blockRows);

  return <article className="lesson-preview">
    <header>
      <div><span className="eyebrow">Prévia editorial</span><h1>{lesson.title}</h1><p>{lesson.modules?.disciplines?.cycles?.title} · {lesson.modules?.disciplines?.title} · {lesson.modules?.title}</p></div>
      <Badge>{lesson.access_level === 'premium' ? 'Premium' : 'Gratuito'}</Badge>
    </header>
    <div className="lesson-preview__body">
      <p>{lesson.summary || 'Adicione um resumo para apresentar esta aula aos estudantes.'}</p>
      {blocks.length > 0 ? blocks.map((block) => block.type === 'heading'
        ? <h2 key={block.id}>{block.text}</h2>
        : block.type === 'image' && block.src
          ? <figure key={block.id}><Image alt={block.text || 'Imagem da aula'} height={800} src={block.src} unoptimized width={1200} />{block.text && <figcaption>{block.text}</figcaption>}</figure>
          : block.type === 'video' && block.src
            ? <video controls key={block.id} preload="metadata" src={block.src}>Seu navegador não suporta reprodução de vídeo.</video>
            : <div className={block.type === 'callout' ? 'student-callout' : 'student-paragraph'} key={block.id}><LessonText text={block.text} formatted={block.format === 'medhelp-markdown-v1'} /></div>)
        : <div className="lesson-preview__placeholder"><span aria-hidden="true">✚</span><strong>Conteúdo da aula</strong><small>Blocos de texto, mídia, resumos e materiais aparecerão aqui.</small></div>}
    </div>
    <Link className={buttonClassName('secondary')} href={`/editor/conteudos/${id}`}>Voltar ao editor</Link>
  </article>;
}
