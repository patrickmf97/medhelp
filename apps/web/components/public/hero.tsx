import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { siteConfig } from '@/src/site-config';

export function Hero() {
  return (
    <section className="hero" data-section="inicio">
      <div aria-hidden="true" className="hero__grid-lines" />
      <span aria-hidden="true" className="hero__orb hero__orb--one" data-parallax="slow" />
      <span aria-hidden="true" className="hero__orb hero__orb--two" data-parallax="fast" />
      <div className="container hero__grid">
        <div className="hero__copy" data-reveal>
          <Badge>Conteúdo, prática e anatomia conectados</Badge>
          <h1>{siteConfig.headline}</h1>
          <p className="hero__description">{siteConfig.description}</p>
          <div className="hero__actions">
            <Link className={buttonClassName()} href="/cadastro">Começar agora <span aria-hidden="true">↗</span></Link>
            <Link className={buttonClassName('secondary')} href="/explorar"><span aria-hidden="true">◎</span> Explorar gratuitamente</Link>
          </div>
          <div aria-label="Preço do plano" className="hero__price">
            <strong>R$ 30/mês</strong>
            <span>Plano único · cancele quando quiser</span>
          </div>
          <div className="hero__assurances" aria-label="Diferenciais da plataforma">
            <span><i aria-hidden="true">✓</i> Organizada por ciclos</span>
            <span><i aria-hidden="true">✓</i> Progresso preservado</span>
            <span><i aria-hidden="true">✓</i> Conteúdo com revisão editorial</span>
          </div>
        </div>
        <div className="hero__visual" data-reveal data-reveal-delay="2">
          <span className="preview-float preview-float--atlas"><i aria-hidden="true">◎</i><span>Atlas conectado<strong>Explore por sistema</strong></span></span>
          <span className="preview-float preview-float--review"><i aria-hidden="true">✓</i><span>Revisão organizada<strong>Próximo passo claro</strong></span></span>
          <div aria-label="Prévia demonstrativa do painel de estudos" className="dashboard-preview">
            <div className="dashboard-preview__chrome"><span><i /><i /><i /></span><strong>MEDHELP · Meu dia</strong><small>Demonstração</small></div>
            <div className="dashboard-preview__layout">
              <aside aria-hidden="true"><b>M</b><span className="is-active">⌂</span><span>▤</span><span>◎</span><span>◇</span></aside>
              <div className="dashboard-preview__content">
                <div className="dashboard-preview__welcome"><div><small>Quarta-feira · plano demonstrativo</small><strong>Bom estudo, futuro médico.</strong></div><span>PM</span></div>
                <div className="dashboard-preview__progress"><div><span>Trilha atual</span><strong>Fisiologia cardiovascular</strong><small>7 de 12 etapas visualizadas</small></div><b>58%</b></div>
                <div className="progress-track"><span /></div>
                <div className="dashboard-preview__cards">
                  <article className="dashboard-preview__lesson"><span className="preview-icon">01</span><small>Continuar estudando</small><strong>Integração cardíaca</strong><p>Resumo visual · 16 min</p><button tabIndex={-1} type="button">Continuar <i aria-hidden="true">→</i></button></article>
                  <article className="dashboard-preview__queue"><div><small>Revisões do dia</small><strong>Fila inteligente</strong></div><ul><li><span>FC</span><div><strong>Flashcards</strong><small>Revisão ativa</small></div><b>12</b></li><li><span>QC</span><div><strong>Questões</strong><small>Prática comentada</small></div><b>08</b></li></ul></article>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="hero__scroll-cue"><span>Role para explorar</span><i>↓</i></div>
    </section>
  );
}
