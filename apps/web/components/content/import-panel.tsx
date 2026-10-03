'use client';

import { useState, useTransition } from 'react';
import { buttonClassName } from '@medhelp/ui';
import { applyImportAction, previewImportAction, publishImportAction } from '@/app/editor/conteudos/importar/actions';

type Preview = Extract<Awaited<ReturnType<typeof previewImportAction>>, { ok: true }>['value'];

function valueOf<T>(result: { ok: true; value: T } | { ok: false; message: string }): T {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

export function ImportPanel() {
  const [bundle, setBundle] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [batchId, setBatchId] = useState('');
  const [published, setPublished] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setError('');
    startTransition(async () => {
      try { await action(); } catch (cause) {
        setError(cause instanceof Error && !('digest' in cause) ? cause.message : 'Não foi possível concluir a operação.');
      }
    });
  }

  return <div className="editor-form">
    <p>Selecione o pacote compilado. Simule, confira as contagens e importe para revisão. A publicação do lote é uma etapa separada.</p>
    <p>Antes de importar em produção, verifique o backup conforme o procedimento operacional.</p>
    <label htmlFor="lesson-bundle">Pacote de aulas</label>
    <input id="lesson-bundle" type="file" accept=".json,application/json" disabled={pending || !!batchId} onChange={(event) => {
      const file = event.target.files?.[0];
      setBundle(''); setPreview(null); setError('');
      if (!file) return;
      run(async () => {
        if (file.size > 500_000) throw new Error('Selecione um pacote de até 500 KB.');
        const text = await file.text();
        JSON.parse(text);
        setBundle(text);
      });
    }} />
    <button className={buttonClassName('secondary')} disabled={pending || !bundle || published} onClick={() => run(async () => {
      setPreview(null);
      setPreview(valueOf(await previewImportAction(bundle)));
    })}>Simular importação</button>
    {preview && <section aria-label="Resultado da simulação">
      <h2>Conferência do pacote</h2>
      <p>{preview.create} novas · {preview.update} atualizadas · {preview.unchanged} sem alteração</p>
      <p>Identificador do acervo: <code style={{ overflowWrap: 'anywhere' }}>{preview.digest}</code></p>
      {preview.conflicts.length > 0 && <><h3>Conflitos — importação bloqueada</h3><ul>{preview.conflicts.map((conflict, index) => <li key={index}>{conflict.editorialId}: {conflict.reason}</li>)}</ul></>}
      {!batchId && <button className={buttonClassName('primary')} disabled={pending || preview.conflicts.length > 0} onClick={() => run(async () => {
        const result = valueOf(await applyImportAction(bundle, preview.expectedState));
        setBatchId(result.batchId);
        setPreview(null);
      })}>Importar para revisão</button>}
    </section>}
    {batchId && <section aria-label="Lote importado">
      <h2>{published ? 'Lote publicado' : 'Lote em revisão'}</h2>
      <p>Lote: <code>{batchId}</code></p>
      {!published && <>
        <p>Confira as aulas no catálogo editorial. Em seguida, simule novamente para verificar o estado atual antes de publicar.</p>
        <a href="/editor/conteudos" target="_blank" rel="noopener noreferrer">Conferir aulas importadas</a>
        {preview && <button className={buttonClassName('primary')} disabled={pending || preview.conflicts.length > 0 || preview.create > 0 || preview.update > 0} onClick={() => run(async () => {
          valueOf(await publishImportAction(batchId, preview.expectedState));
          setPublished(true); setBundle('');
        })}>Publicar lote</button>}
      </>}
      {published && <p>As aulas do lote estão disponíveis no catálogo, conforme o nível de acesso de cada aluno.</p>}
    </section>}
    {pending && <p role="status">Processando…</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
