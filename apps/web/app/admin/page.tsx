import Link from 'next/link';
import {
  PENDING_METRICS,
  getAdminMetrics,
  resolveRangeDays,
  type MetricsRangeDays,
} from '@/lib/admin/metrics';

const RANGE_OPTIONS: readonly { days: MetricsRangeDays; label: string }[] = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
];

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const query = await searchParams;
  const rangeDays = resolveRangeDays(query.range);
  const metrics = await getAdminMetrics(rangeDays);
  const { overview, topLessons } = metrics;

  return (
    <div className="admin-metrics">
      <section className="admin-metrics__head">
        <div>
          <span className="eyebrow">Painel administrativo</span>
          <h1>Indicadores</h1>
          <p>Métricas calculadas em tempo real a partir do banco de dados. Período: últimos {rangeDays} dias.</p>
        </div>
        <nav aria-label="Selecionar período" className="admin-metrics__range">
          {RANGE_OPTIONS.map((option) => (
            <Link
              key={option.days}
              href={`/admin?range=${option.days}`}
              aria-current={option.days === rangeDays ? 'true' : undefined}
              className={option.days === rangeDays ? 'is-active' : undefined}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </section>

      <div className="admin-metrics__grid">
        <article>
          <span>✦ Assinantes ativos</span>
          <strong>{formatNumber(overview.activeSubscribers)}</strong>
          <small>Assinaturas em estado ativo ou em tolerância, com acesso vigente</small>
        </article>
        <article>
          <span>↗ Novas assinaturas</span>
          <strong>{formatNumber(overview.newSubscriptions)}</strong>
          <small>Assinaturas criadas no período (exclui pendentes)</small>
        </article>
        <article>
          <span>↘ Cancelamentos</span>
          <strong>{formatNumber(overview.cancellations)}</strong>
          <small>Assinaturas canceladas com atualização no período</small>
        </article>
        <article>
          <span>◎ Aulas iniciadas</span>
          <strong>{formatNumber(overview.lessonsStarted)}</strong>
          <small>Progresso de aula registrado no período</small>
        </article>
        <article>
          <span>✓ Taxa de conclusão</span>
          <strong>{formatPercent(overview.completionRate)}</strong>
          <small>{formatNumber(overview.lessonsCompleted)} de {formatNumber(overview.lessonsStarted)} aulas concluídas</small>
        </article>
        <article>
          <span>▤ Revisões de flashcards</span>
          <strong>{formatNumber(overview.flashcardReviews)}</strong>
          <small>Retenção (avaliações &ldquo;bom&rdquo;/&ldquo;fácil&rdquo;): {formatPercent(overview.flashcardRetentionRate)}</small>
        </article>
      </div>

      <section className="admin-metrics__panel">
        <div className="admin-metrics__panel-head">
          <h2>Conteúdos mais acessados</h2>
          <p>Aulas com progresso registrado no período, ordenadas por número de alunos distintos.</p>
        </div>
        {topLessons.length ? (
          <table className="admin-metrics__table">
            <thead>
              <tr>
                <th scope="col">Aula</th>
                <th scope="col">Alunos</th>
                <th scope="col">Conclusões</th>
              </tr>
            </thead>
            <tbody>
              {topLessons.map((lesson) => (
                <tr key={lesson.lessonId}>
                  <td>{lesson.title}</td>
                  <td>{formatNumber(lesson.learners)}</td>
                  <td>{formatNumber(lesson.completions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="student-muted">Nenhum progresso de aula registrado neste período.</p>
        )}
      </section>

      <section className="admin-metrics__pending">
        <h2>Indicadores pendentes</h2>
        <p>Previstos na especificação, mas ainda sem dado real no banco — não exibidos para evitar números fictícios.</p>
        <ul>
          {PENDING_METRICS.map((metric) => (
            <li key={metric.key}>
              <strong>{metric.label}</strong>
              <span>{metric.reason}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
