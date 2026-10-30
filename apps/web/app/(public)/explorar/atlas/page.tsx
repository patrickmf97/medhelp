import type { Metadata } from 'next';

import { AtlasRealViewer } from '@/components/public/atlas-real-viewer';

export const metadata: Metadata = {
  title: 'Atlas 3D real',
  description: 'Demonstração pública do Atlas 3D MEDHELP com geometria real convertida pelo pipeline oficial e câmera orbital.',
};

export default function AtlasRealPage() {
  return (
    <div className="explore-page">
      <section className="explore-hero">
        <div className="container">
          <span className="eyebrow">Atlas 3D MEDHELP · demonstração pública</span>
          <h1>O corpo real, renderizado pelo pipeline oficial.</h1>
          <p>
            Esta é a versão real do Atlas 3D — carregada a partir dos pacotes GLB gerados pelo pipeline oficial do
            MEDHELP, não uma prévia ilustrativa. Arraste para orbitar a câmera e use a roda do mouse para
            aproximar ou afastar.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <AtlasRealViewer />
          <p className="atlas-viewer-credit">
            Conteúdo derivado de Z-Anatomy, licenciado em CC BY-SA 4.0. Hospedagem provisória como ativo estático —
            sem CDN dedicado ainda.
          </p>
        </div>
      </section>
    </div>
  );
}
