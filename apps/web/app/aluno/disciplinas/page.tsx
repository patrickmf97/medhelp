import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-role';
import { getStudentDashboard } from '@/lib/study/student-service';
import { groupLessons } from '@/lib/study/group-lessons';

export default async function DisciplinesPage() {
  const { user } = await requireUser('/aluno/disciplinas');
  const journey = await getStudentDashboard(user.id);
  const cycles = groupLessons(journey.lessons);
  const completedIds = new Set(journey.progress.filter(item => item.completed_at).map(item => item.lesson_id));
  return <div className="student-page">
    <header className="student-page-head">
      <span className="eyebrow">Biblioteca de estudos</span>
      <h1>Disciplinas e aulas</h1>
      <p>Encontre sua disciplina, escolha um módulo e avance no seu ritmo. As aulas gratuitas estão sempre abertas; as premium acompanham sua assinatura.</p>
      <p>O ciclo básico oferece uma trilha introdutória, que complementa os estudos da graduação.</p>
    </header>
    {cycles.length ? cycles.map(cycle => <section className="student-catalog-section" key={cycle.cycle}>
      <div className="student-section-head"><h2>{cycle.cycle}</h2><span>{cycle.disciplines.reduce((total, discipline) => total + discipline.modules.reduce((count, module) => count + module.lessons.length, 0), 0)} aulas</span></div>
      {cycle.disciplines.map(discipline => <section className="student-discipline" key={discipline.title}>
        <h3>{discipline.title}</h3>
        {discipline.modules.map(module => <section className="student-module" key={module.title}>
          <h4>{module.title}</h4>
          <div className="student-lesson-grid">{module.lessons.map(lesson => {
            const locked = lesson.accessLevel === 'premium' && !journey.premiumAccess;
            const completed = completedIds.has(lesson.id);
            return <Link className="student-lesson-card" href={`/aluno/disciplinas/${lesson.id}`} key={lesson.id}>
              <span className="student-lesson-card__meta">{lesson.accessLevel === 'free' ? 'Gratuita' : 'Premium'} <b>{completed ? 'Concluída' : locked ? 'Acesso premium' : 'Disponível'}</b></span>
              <h5>{lesson.title}</h5>
              <span className="student-lesson-card__footer">{locked ? 'Ver prévia' : completed ? 'Revisar aula' : 'Abrir aula'} <span aria-hidden="true">↗</span></span>
            </Link>;
          })}</div>
        </section>)}
      </section>)}
    </section>) : <div className="student-empty student-empty--wide"><span aria-hidden="true">◌</span><h2>Novas aulas estão a caminho.</h2><p>O catálogo do aluno será atualizado conforme os conteúdos forem publicados.</p><Link href="/explorar">Conhecer os ciclos →</Link></div>}
  </div>;
}
