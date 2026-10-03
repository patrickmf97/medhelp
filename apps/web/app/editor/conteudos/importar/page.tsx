import { requireRole } from '@/lib/auth/require-role';
import { ImportPanel } from '@/components/content/import-panel';

export default async function ImportContentPage() {
  await requireRole(['editor', 'admin'], '/editor/conteudos/importar');
  return <section className="editor-page">
    <header className="editor-page__header"><div><span className="eyebrow">Acervo MEDHELP</span><h1>Importar aulas</h1><p>Importação conferida e publicação por lote.</p></div></header>
    <ImportPanel />
  </section>;
}
