import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getStudentLesson } from '@/lib/study/student-service';
import { LessonControls } from './lesson-controls';

export default async function StudentLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudentLesson(id);
  if (!data) notFound();
  const { lesson, blocks, locked, progress, favorite } = data;
  const video = blocks.find((block) => block.type === 'video' && block.src)?.src ?? null;
  return <article className="student-page student-lesson"><Link className="back-link" href="/aluno/disciplinas">← Todas as disciplinas</Link><header className="student-page-head"><span className="eyebrow">{lesson.cycle} / {lesson.discipline} / {lesson.module}</span><h1>{lesson.title}</h1><p>{lesson.summary ?? 'Explore esta aula no seu ritmo.'}</p><span className="mh-badge">{lesson.accessLevel === 'free' ? 'Aula gratuita' : 'Aula premium'}</span></header>{locked ? <section className="student-locked"><span aria-hidden="true">✧</span><h2>Continue sua jornada com o Premium</h2><p>Esta aula faz parte do plano Premium. Seu progresso anterior fica salvo e estará aqui quando seu acesso voltar.</p><Link className="mh-button mh-button--primary" href="/#preco">Conhecer os planos ↗</Link></section> : <><LessonControls lessonId={lesson.id} initialSeconds={progress?.seconds ?? 0} initiallyComplete={Boolean(progress?.completed_at)} initiallyFavorite={favorite} videoUrl={video} /><section className="student-lesson-content" aria-label="Conteúdo da aula">{blocks.filter((block) => block.type !== 'video').map((block) => block.type === 'heading' ? <h2 key={block.id}>{block.text}</h2> : block.type === 'image' && block.src ? <figure key={block.id}><Image src={block.src} alt={block.text || 'Imagem da aula'} width={1200} height={800} unoptimized />{block.text && <figcaption>{block.text}</figcaption>}</figure> : <div className={block.type === 'callout' ? 'student-callout' : 'student-paragraph'} key={block.id}>{block.text.split('\n').map((line, index) => <p key={index}>{line}</p>)}</div>)}{!blocks.length && <div className="student-empty"><h2>Conteúdo em preparação</h2><p>Esta aula já está no catálogo, mas ainda não tem blocos de leitura publicados.</p></div>}</section></>}<footer className="student-lesson-footer"><Link href="/aluno/disciplinas">← Voltar às disciplinas</Link><Link href="/aluno/progresso">Ver meu progresso ↗</Link></footer></article>;
}
