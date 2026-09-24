import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-role';
import { getStudentDashboard } from '@/lib/study/student-service';

export default async function DisciplinesPage() {
  const { user } = await requireUser('/aluno/disciplinas');
  const journey = await getStudentDashboard(user.id);
  const cycles = [...new Set(journey.lessons.map((lesson) => lesson.cycle))];
  return <div className="student-page"><header className="student-page-head"><span className="eyebrow">Biblioteca de estudos</span><h1>Disciplinas e aulas</h1><p>Escolha um tema para estudar. As aulas gratuitas estão sempre abertas; as premium acompanham sua assinatura.</p></header>{cycles.length ? cycles.map((cycle) => <section className="student-catalog-section" key={cycle}><div className="student-section-head"><h2>{cycle}</h2><span>{journey.lessons.filter((lesson) => lesson.cycle === cycle).length} aulas</span></div><div className="student-lesson-grid">{journey.lessons.filter((lesson) => lesson.cycle === cycle).map((lesson) => { const locked = lesson.accessLevel === 'premium' && !journey.premiumAccess; const completed = journey.progress.some((item) => item.lesson_id === lesson.id && item.completed_at); return <Link className="student-lesson-card" href={`/aluno/disciplinas/${lesson.id}`} key={lesson.id}><span className="student-lesson-card__meta">{lesson.discipline} <b>{completed ? 'Concluída' : locked ? 'Premium' : 'Disponível'}</b></span><h3>{lesson.title}</h3><span className="student-lesson-card__footer">{locked ? 'Ver prévia' : completed ? 'Revisar aula' : 'Abrir aula'} <span aria-hidden="true">↗</span></span></Link>; })}</div></section>) : <div className="student-empty student-empty--wide"><span aria-hidden="true">◌</span><h2>Novas aulas estão a caminho.</h2><p>O catálogo do aluno será atualizado conforme os conteúdos forem publicados.</p><Link href="/explorar">Conhecer os ciclos →</Link></div>}</div>;
}
