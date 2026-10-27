import Link from 'next/link';
import { EbookForm } from '@/components/editor/ebook-form';
import { createEbookAction } from '../actions';

export default function NewEbookPage() {
  return <section className="editor-page editor-page--narrow">
    <Link className="back-link" href="/editor/biblioteca">← Voltar à biblioteca</Link>
    <header className="editor-page__header"><div><span className="eyebrow">Novo ebook</span><h1>Cadastrar material</h1><p>Envie o arquivo, preencha os metadados e salve como rascunho para revisão.</p></div></header>
    <EbookForm action={createEbookAction} />
  </section>;
}
