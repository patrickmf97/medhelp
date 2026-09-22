import { Card } from '@medhelp/ui';

const features = [
  ['Resumos que orientam', 'Conteúdo direto ao ponto para construir raciocínio clínico sem perder profundidade.', '▤'],
  ['Flashcards inteligentes', 'Revisões organizadas para ajudar você a lembrar do que estudou no momento certo.', '◫'],
  ['Questões comentadas', 'Treine a tomada de decisão e entenda o caminho por trás de cada resposta.', '✓'],
  ['Biblioteca acadêmica', 'Ebooks gratuitos e materiais com direitos verificados, reunidos com cuidado.', '▥'],
] as const;

export function Features() {
  return (
    <section className="section" id="recursos">
      <div className="container">
        <div className="section-heading"><span className="eyebrow">Tudo no mesmo lugar</span><h2>Ferramentas que acompanham seu ritmo</h2><p>Menos tempo organizando fontes. Mais clareza para estudar, revisar e avançar.</p></div>
        <div className="feature-grid">
          {features.map(([title, description, icon]) => <Card key={title}><span aria-hidden="true" className="card-icon">{icon}</span><h3>{title}</h3><p>{description}</p></Card>)}
        </div>
      </div>
    </section>
  );
}
