import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { AtlasExplorer } from './atlas-explorer';

export function AtlasDemo() {
  return (
    <section className="section atlas-section" data-reveal id="atlas">
      <div className="container">
        <div className="atlas-intro">
          <div>
            <Badge>Atlas 3D MEDHELP</Badge>
            <h2>Entenda o corpo em camadas, não em páginas soltas.</h2>
          </div>
          <div className="atlas-copy">
            <p>Explore sistemas, selecione estruturas e mantenha cada descoberta conectada ao seu plano de estudos.</p>
            <Link className={buttonClassName('secondary')} href="/explorar">Explorar catálogo de conteúdos <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <AtlasExplorer />
      </div>
    </section>
  );
}
