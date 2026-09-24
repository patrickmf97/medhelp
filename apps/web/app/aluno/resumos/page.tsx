import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-role';
import { listPublicCatalog } from '@/lib/content/public-catalog';

export default async function StudentSummariesPage() {
  const { supabase } = await requireUser('/aluno/resumos');
  const [catalog, result] = await Promise.all([listPublicCatalog(), supabase.from('summaries').select('id,lesson_id,title,body,position').is('deleted_at', null).order('position')]);
  if (result.error) throw new Error('Não foi possível carregar os resumos.');
  const lessons = new Map(catalog.map((lesson) => [lesson.id, lesson]));
  const summaries = (result.data ?? []).flatMap((summary) => { const lesson = lessons.get(summary.lesson_id); return lesson ? [{ ...summary, lesson }] : []; });
  return <div className="student-page"><header className="student-page-head"><span className="eyebrow">Revisão essencial</span><h1>Resumos</h1><p>Os pontos mais importantes de cada aula em um lugar para revisar quando precisar.</p></header>{summaries.length ? <div className="student-summary-list">{summaries.map((summary) => <article className="student-panel" key={summary.id}><span className="eyebrow">{summary.lesson.discipline}</span><h2>{summary.title}</h2><p>{summary.body}</p><Link href={`/aluno/disciplinas/${summary.lesson.id}`}>Abrir aula ↗</Link></article>)}</div> : <div className="student-empty student-empty--wide"><span aria-hidden="true">✧</span><h2>Os resumos aparecerão aqui.</h2><p>Quando as primeiras aulas e seus resumos forem publicados, você poderá revisá-los nesta página.</p><Link href="/aluno/disciplinas">Explorar disciplinas →</Link></div>}</div>;
}
