const features = [
  ['01', 'Conteúdo que cria contexto', 'Aulas e resumos organizados para ligar fundamentos, sinais e decisões.', 'feature-card--content'],
  ['02', 'Revisão que encontra você', 'Flashcards em uma fila clara para retomar o tema certo no momento certo.', 'feature-card--review'],
  ['03', 'Questões com caminho comentado', 'Pratique decisões e entenda o raciocínio por trás de cada alternativa.', 'feature-card--questions'],
  ['04', 'Atlas conectado ao estudo', 'Saia da estrutura anatômica direto para aulas, revisões e relações.', 'feature-card--atlas'],
  ['05', 'Biblioteca com origem verificada', 'Materiais acadêmicos gratuitos e licenciados reunidos com responsabilidade.', 'feature-card--library'],
] as const;

export function Features() {
  return (
    <section className="section features-section" data-reveal id="recursos">
      <div className="container">
        <div className="section-heading section-heading--wide"><span className="eyebrow">Uma rotina, um fluxo</span><h2>Um sistema de estudo. Não mais uma pilha de abas.</h2><p>Cada ferramenta resolve uma etapa diferente, mas todas compartilham o mesmo contexto e o mesmo progresso.</p></div>
        <div className="feature-bento">
          {features.map(([number, title, description, className]) => <article className={`feature-card ${className}`} data-reveal key={title}><div className="feature-card__top"><span aria-hidden="true">{number}</span><i aria-hidden="true">↗</i></div><div><h3>{title}</h3><p>{description}</p></div>{className === 'feature-card--content' ? <div aria-hidden="true" className="feature-card__flow"><span>Aula</span><i>→</i><span>Resumo</span><i>→</i><span>Prática</span></div> : null}{className === 'feature-card--review' ? <div aria-hidden="true" className="feature-card__bars"><i /><i /><i /><i /></div> : null}</article>)}
        </div>
      </div>
    </section>
  );
}
