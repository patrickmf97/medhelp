const questions = [
  ['Posso conhecer a MEDHELP antes de assinar?', 'Sim. A área gratuita reúne conteúdos introdutórios e uma prévia da experiência para você explorar sem compromisso.'],
  ['O plano inclui todas as ferramentas?', 'Sim. O plano único inclui os conteúdos premium, flashcards, questões, biblioteca e o futuro Atlas 3D.'],
  ['Meu progresso é perdido se eu cancelar?', 'Não. Seu histórico de estudos permanece preservado; apenas o acesso aos recursos premium fica pausado ao fim do período pago.'],
  ['A MEDHELP substitui livros e orientação docente?', 'Não. A plataforma é um apoio à formação e deve ser usada junto às referências acadêmicas e à orientação da sua instituição.'],
  ['O Atlas 3D já está disponível por completo?', 'A experiência completa está em desenvolvimento. A página pública apresenta uma prévia ilustrativa e deixa esse estágio claro antes da assinatura.'],
] as const;

export function Faq() {
  return <section className="section faq" data-reveal id="faq"><div className="container faq-grid"><div className="section-heading"><span className="eyebrow">Antes de começar</span><h2>Perguntas frequentes</h2><p>As respostas essenciais para decidir com tranquilidade.</p><span className="faq-index" aria-hidden="true">FAQ / 05</span></div><div className="faq-list">{questions.map(([question, answer], index) => <details key={question}><summary><span><i>{String(index + 1).padStart(2, '0')}</i>{question}</span><b aria-hidden="true">+</b></summary><p>{answer}</p></details>)}</div></div></section>;
}
