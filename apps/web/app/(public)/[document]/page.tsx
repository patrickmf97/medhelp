import { buttonClassName } from '@medhelp/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const pages = {
  contato: { title: 'Fale com a MEDHELP', body: 'Nosso canal de atendimento será publicado antes da abertura oficial. Enquanto isso, acompanhe a evolução do produto por esta página.' },
  termos: { title: 'Termos de uso', body: 'Esta versão inicial descreve a estrutura do serviço e será submetida à revisão jurídica antes do lançamento comercial.' },
  privacidade: { title: 'Privacidade', body: 'A MEDHELP foi projetada para coletar apenas os dados necessários à conta, ao acesso e à continuidade dos estudos. A política final passará por revisão jurídica antes do lançamento.' },
  'creditos-e-licencas': { title: 'Créditos e licenças', body: 'O futuro Atlas 3D utilizará dados do BodyParts3D sob licença CC BY 4.0, com atribuição completa publicada junto ao produto.' },
  explorar: { title: 'Explore a MEDHELP', body: 'Os primeiros resumos, materiais acadêmicos e a prévia navegável do Atlas serão adicionados nos próximos blocos de desenvolvimento.' },
} as const;

type DocumentSlug = keyof typeof pages;

export function generateStaticParams() { return Object.keys(pages).map((document) => ({ document })); }

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }): Promise<Metadata> {
  const { document } = await params;
  return { title: document in pages ? pages[document as DocumentSlug].title : 'Página' };
}

export default async function InformationPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!(document in pages)) notFound();
  const page = pages[document as DocumentSlug];
  return <section className="info-page"><div className="container info-page__inner"><span className="eyebrow">MEDHELP</span><h1>{page.title}</h1><p>{page.body}</p><Link className={buttonClassName('secondary')} href="/">Voltar ao início</Link></div></section>;
}
