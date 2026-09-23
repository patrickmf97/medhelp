import { Badge, buttonClassName } from '@medhelp/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPublicFreeSample } from '@/lib/content/public-catalog';

export const metadata: Metadata = { title: 'Amostra gratuita' };

export default async function SamplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const sample = await getPublicFreeSample(id);
  if (!sample) notFound();

  return <article className="sample-page section">
    <div className="container sample-page__inner">
      <Link className="sample-page__back" href="/explorar">← Voltar ao catálogo</Link>
      <div className="sample-page__content">
        <Badge>Amostra gratuita publicada</Badge>
        <h1>{sample.title}</h1>
        <p className="sample-page__trail">{sample.cycle} · {sample.discipline} · {sample.module}</p>
        {sample.summary ? <p className="sample-page__summary">{sample.summary}</p> : null}
        {sample.blocks.length > 0 ? <div className="sample-page__blocks">
          {sample.blocks.map((block) => block.type === 'heading'
            ? <h2 key={block.id}>{block.text}</h2>
            : <p className={block.type === 'callout' ? 'sample-page__callout' : undefined} key={block.id}>{block.text}</p>)}
        </div> : <p className="sample-page__notice">O texto desta aula ainda está em preparação editorial. A descrição acima é a prévia publicada.</p>}
        <div className="sample-page__actions">
          <Link className={buttonClassName('primary')} href="/cadastro">Criar conta para acompanhar</Link>
          <Link className={buttonClassName('secondary')} href="/explorar">Explorar mais conteúdos</Link>
        </div>
        <small>Conteúdo educacional. Não substitui avaliação médica ou protocolos assistenciais.</small>
      </div>
    </div>
  </article>;
}
