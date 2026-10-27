import { buttonClassName } from '@medhelp/ui';
import Link from 'next/link';

export interface RouteNotFoundViewProps {
  homeHref?: string;
  homeLabel?: string;
  title?: string;
  description?: string;
}

/**
 * Minimal, on-brand 404 UI shared by every route-level `not-found.tsx`
 * boundary (reached via Next.js' `notFound()`, e.g. a lesson, discipline or
 * document id that does not exist).
 */
export function RouteNotFoundView({
  homeHref = '/',
  homeLabel = 'Voltar ao início',
  title = 'Não encontramos esta página.',
  description = 'O conteúdo pode ter sido movido ou não existe mais. Confira o endereço ou volte para um ponto conhecido.',
}: RouteNotFoundViewProps) {
  return (
    <section className="route-error route-error--not-found">
      <span aria-hidden="true">◌</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link className={buttonClassName('secondary')} href={homeHref}>{homeLabel}</Link>
    </section>
  );
}
