import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';

export function AtlasDemo() {
  return (
    <section className="section atlas-section" id="atlas">
      <div className="container atlas-grid">
        <div className="atlas-visual" role="img" aria-label="Prévia ilustrativa do futuro Atlas 3D de anatomia humana">
          <span className="atlas-orbit atlas-orbit--one" /><span className="atlas-orbit atlas-orbit--two" />
          <svg aria-hidden="true" viewBox="0 0 240 400">
            <defs><linearGradient id="body" x1="0" x2="1"><stop stopColor="#16a085"/><stop offset="1" stopColor="#77d3be"/></linearGradient></defs>
            <circle cx="120" cy="47" r="31" fill="url(#body)"/><path d="M89 82c-24 17-26 68-19 111l13 70-20 105h36l21-96 21 96h36l-20-105 13-70c7-43 5-94-19-111-18 10-44 10-62 0Z" fill="url(#body)"/><path d="M76 104 40 225l26 8 43-113M164 104l36 121-26 8-43-113" fill="none" stroke="#77d3be" strokeLinecap="round" strokeWidth="24"/>
          </svg>
          <div className="atlas-label atlas-label--heart"><span />Sistema cardiovascular</div>
          <div className="atlas-label atlas-label--brain"><span />Sistema nervoso</div>
          <small>Prévia visual · Atlas interativo em desenvolvimento</small>
        </div>
        <div className="atlas-copy">
          <Badge>Atlas 3D MEDHELP</Badge><h2>Veja a anatomia como ela realmente se conecta</h2><p>Explore estruturas por sistemas, isole regiões e relacione cada detalhe anatômico com o conteúdo das disciplinas.</p>
          <ul><li>Visualização por sistemas e regiões</li><li>Identificação clara de estruturas</li><li>Conexão com aulas e revisões</li></ul>
          <Link className={buttonClassName('secondary')} href="/explorar">Conhecer a prévia</Link>
        </div>
      </div>
    </section>
  );
}
