const questions = [
  ['Posso conhecer a MEDHELP antes de assinar?', 'Sim. A área gratuita reúne conteúdos introdutórios e uma prévia da experiência para você explorar sem compromisso.'],
  ['O plano inclui todas as ferramentas?', 'Sim. O plano único inclui os conteúdos premium, flashcards, questões, biblioteca e o futuro Atlas 3D.'],
  ['Meu progresso é perdido se eu cancelar?', 'Não. Seu histórico de estudos permanece preservado; apenas o acesso aos recursos premium fica pausado ao fim do período pago.'],
  ['A MEDHELP substitui livros e orientação docente?', 'Não. A plataforma é um apoio à formação e deve ser usada junto às referências acadêmicas e à orientação da sua instituição.'],
] as const;

export function Faq() {
  return <section className="section faq" id="faq"><div className="container faq-grid"><div className="section-heading"><span className="eyebrow">Antes de começar</span><h2>Perguntas frequentes</h2><p>As respostas essenciais para decidir com tranquilidade.</p></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>;
}
