const cycles = [
  ['01', 'Ciclo Básico', 'Construa bases sólidas em anatomia, fisiologia, bioquímica e outras disciplinas essenciais.'],
  ['02', 'Ciclo Clínico', 'Conecte sinais, sintomas, exames e condutas com uma visão integrada do paciente.'],
  ['03', 'Internato', 'Revise de forma ágil e organizada para os desafios da prática e das avaliações.'],
] as const;

export function StudyJourney() {
  return (
    <>
      <section className="section journey" id="disciplinas"><div className="container"><div className="section-heading"><span className="eyebrow">Da base à prática</span><h2>Uma plataforma para cada fase da formação</h2></div><div className="cycle-grid">{cycles.map(([number, title, text]) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
      <section className="section routine"><div className="container routine-grid"><div><span className="eyebrow">Rotina mais leve</span><h2>Saiba o que estudar hoje — e o que revisar amanhã</h2><p>A MEDHELP transforma uma grande quantidade de conteúdo em próximos passos claros, preservando seu progresso ao longo de toda a formação.</p></div><ul><li><strong>Organização sem atrito</strong><span>Conteúdos agrupados por ciclo, disciplina e tema.</span></li><li><strong>Continuidade real</strong><span>Retome de onde parou, em qualquer dispositivo.</span></li><li><strong>Aprendizado ativo</strong><span>Alterne leitura, revisão e prática na mesma jornada.</span></li></ul></div></section>
      <section className="section free-library" id="biblioteca"><div className="container free-library__inner"><div><span className="eyebrow">Comece gratuitamente</span><h2>Conteúdo confiável para conhecer a experiência</h2><p>Explore materiais selecionados, resumos introdutórios e a prévia do Atlas antes de assinar.</p></div><div className="library-stack" aria-hidden="true"><span>ANATOMIA</span><span>FISIOLOGIA</span><span>CLÍNICA</span></div></div></section>
    </>
  );
}
