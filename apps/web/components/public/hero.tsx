import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { siteConfig } from '@/src/site-config';

export function Hero() {
  return (
    <section className="hero">
      <div className="container hero__grid">
        <div className="hero__copy">
          <Badge>Feita para a jornada médica</Badge>
          <h1>{siteConfig.headline}</h1>
          <p className="hero__description">{siteConfig.description}</p>
          <div className="hero__actions">
            <Link className={buttonClassName()} href="/cadastro">Começar agora</Link>
            <Link className={buttonClassName('secondary')} href="/explorar">Explorar gratuitamente</Link>
          </div>
          <div aria-label="Preço do plano" className="hero__price">
            <strong>R$ 30/mês</strong>
            <span>Plano único · cancele quando quiser</span>
          </div>
        </div>
        <div aria-label="Prévia do painel de estudos" className="dashboard-preview">
          <div className="dashboard-preview__top"><span>Seu progresso</span><strong>68%</strong></div>
          <div className="progress-track"><span /></div>
          <div className="dashboard-preview__cards">
            <article><span className="preview-icon">✦</span><small>Revisão de hoje</small><strong>18 flashcards</strong></article>
            <article><span className="preview-icon">◎</span><small>Próxima aula</small><strong>Fisiologia cardíaca</strong></article>
          </div>
          <div className="study-streak"><span>7 dias de sequência</span><div aria-hidden="true">● ● ● ● ● ● ●</div></div>
        </div>
      </div>
    </section>
  );
}
