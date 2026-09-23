import { buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { StudyPlanner } from './study-planner';

export function StudyJourney() {
  return (
    <>
      <section className="section journey" data-reveal id="disciplinas"><div className="container"><div className="section-heading section-heading--wide"><span className="eyebrow">Da base à prática</span><h2>Seu estudo muda de fase. A plataforma acompanha.</h2><p>Escolha o momento da graduação e veja como a MEDHELP transforma uma rotina extensa em próximos passos claros.</p></div><StudyPlanner /></div></section>
      <section className="section routine" data-reveal><div className="container routine-grid"><div className="routine-copy"><span className="eyebrow">Continuidade real</span><h2>Um caminho visível entre estudar, revisar e praticar.</h2><p>A MEDHELP organiza o excesso de informação em uma sequência simples — sem apagar seu histórico quando a rotina muda.</p><div className="routine-metric"><strong>1</strong><span>jornada conectada para toda a graduação</span></div></div><ol className="routine-steps"><li><span>01</span><div><strong>Entenda</strong><p>Aulas, resumos e mapas visuais constroem contexto.</p></div></li><li><span>02</span><div><strong>Recupere</strong><p>Flashcards retomam os pontos que precisam de atenção.</p></div></li><li><span>03</span><div><strong>Aplique</strong><p>Questões comentadas transformam leitura em decisão.</p></div></li></ol></div></section>
      <section className="section free-library" data-reveal id="biblioteca"><div className="container free-library__inner"><div><span className="eyebrow">Comece gratuitamente</span><h2>Veja a organização antes de escolher o plano.</h2><p>Explore o catálogo público, conteúdos liberados e a prévia do Atlas. Sem período de teste confuso.</p><Link className={buttonClassName('secondary')} href="/explorar">Explorar conteúdos <span aria-hidden="true">↗</span></Link></div><div className="library-stack" aria-hidden="true"><span><small>01</small>ANATOMIA</span><span><small>02</small>FISIOLOGIA</span><span><small>03</small>CLÍNICA</span><i>Biblioteca organizada por contexto</i></div></div></section>
    </>
  );
}
