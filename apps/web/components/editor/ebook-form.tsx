'use client';

import { buttonClassName } from '@medhelp/ui';
import { useState } from 'react';
import { createEbookUploadAction } from '@/app/editor/biblioteca/actions';
import type { EditorialEbook } from '@/lib/content/ebook-repository';

type UploadState = 'idle' | 'signing' | 'uploading' | 'done' | 'error';

interface UploadedFile {
  objectKey: string;
  mimeType: string;
  size: number;
  receipt: string;
  fileName: string;
}

export function EbookForm({
  action,
  ebook,
}: {
  action: (formData: FormData) => void | Promise<void>;
  ebook?: EditorialEbook;
}) {
  const [uploadState, setUploadState] = useState<UploadState>(ebook ? 'done' : 'idle');
  const [uploadMessage, setUploadMessage] = useState(
    ebook ? `Arquivo atual: ${ebook.file_object_key.split('/').pop()}` : 'Selecione o PDF do ebook.',
  );
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      setUploadState('signing');
      setUploadMessage('Preparando envio seguro…');
      const signed = await createEbookUploadAction({ fileName: file.name, mimeType: file.type, size: file.size });
      setUploadState('uploading');
      setUploadMessage('Enviando arquivo…');
      const response = await fetch(signed.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!response.ok) throw new Error('Falha no envio');
      setUploadedFile({ objectKey: signed.objectKey, mimeType: file.type, size: file.size, receipt: signed.receipt, fileName: file.name });
      setUploadState('done');
      setUploadMessage(`Arquivo pronto: ${file.name}`);
    } catch {
      setUploadState('error');
      setUploadMessage('Não foi possível enviar o arquivo. Confira o formato (PDF) e tente novamente.');
    }
  }

  const canSubmit = Boolean(ebook) || uploadState === 'done';

  return (
    <form action={action} className="editor-form">
      {!ebook && (
        <div className="editor-form__grid">
          <label className="mh-field editor-form__wide">
            <span className="mh-field__label">Arquivo do ebook (PDF)</span>
            <input
              accept="application/pdf"
              disabled={uploadState === 'signing' || uploadState === 'uploading'}
              onChange={(event) => void upload(event.target.files?.[0])}
              type="file"
            />
          </label>
          <small className={uploadState === 'error' ? 'mh-field__error' : 'mh-field__hint'} aria-live="polite">
            {uploadMessage}
          </small>
        </div>
      )}
      {uploadedFile && (
        <>
          <input name="objectKey" type="hidden" value={uploadedFile.objectKey} />
          <input name="mimeType" type="hidden" value={uploadedFile.mimeType} />
          <input name="size" type="hidden" value={uploadedFile.size} />
          <input name="receipt" type="hidden" value={uploadedFile.receipt} />
        </>
      )}
      <div className="editor-form__grid">
        <label className="mh-field editor-form__wide">
          <span className="mh-field__label">Título</span>
          <input className="mh-field__input" defaultValue={ebook?.title} maxLength={180} name="title" required />
        </label>
        <label className="mh-field">
          <span className="mh-field__label">Slug</span>
          <input className="mh-field__input" defaultValue={ebook?.slug} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
        </label>
        <label className="mh-field">
          <span className="mh-field__label">Autor</span>
          <input className="mh-field__input" defaultValue={ebook?.author} maxLength={180} name="author" required />
        </label>
        <label className="mh-field editor-form__wide">
          <span className="mh-field__label">Descrição</span>
          <textarea className="mh-field__input" defaultValue={ebook?.description ?? ''} maxLength={2000} name="description" rows={3} />
        </label>
        <label className="mh-field editor-form__wide">
          <span className="mh-field__label">Fonte do material</span>
          <input className="mh-field__input" defaultValue={ebook?.source} maxLength={280} name="source" placeholder="Ex.: Gray's Anatomy, 20ª edição (1918)" required />
        </label>
        <label className="mh-field">
          <span className="mh-field__label">Tipo de licença</span>
          <select className="mh-field__input" defaultValue={ebook?.license_type ?? ''} name="licenseType">
            <option value="">Selecione (obrigatório para publicar)</option>
            <option value="dominio_publico">Domínio público</option>
            <option value="creative_commons">Creative Commons</option>
            <option value="licenca_institucional">Licença institucional</option>
          </select>
        </label>
        <label className="mh-field editor-form__wide">
          <span className="mh-field__label">URL da licença (https)</span>
          <input className="mh-field__input" defaultValue={ebook?.license_url ?? ''} name="licenseUrl" placeholder="https://" type="url" />
        </label>
        <label className="mh-field">
          <span className="mh-field__label">Acesso</span>
          <select className="mh-field__input" defaultValue={ebook?.access_level ?? 'premium'} name="accessLevel">
            <option value="free">Gratuito</option>
            <option value="premium">Premium</option>
          </select>
        </label>
        <label className="mh-field">
          <span className="mh-field__label">Ordem</span>
          <input className="mh-field__input" defaultValue={ebook?.position ?? 0} min={0} name="position" type="number" />
        </label>
      </div>
      <button className={buttonClassName('primary')} disabled={!canSubmit} type="submit">
        {ebook ? 'Salvar alterações' : 'Criar ebook'}
      </button>
      {!ebook && !canSubmit ? <p className="mh-error-message">Envie o arquivo PDF antes de salvar.</p> : null}
      <p className="mh-field__hint">
        Autor e fonte são sempre obrigatórios. Tipo de licença e URL da licença também são obrigatórios, mas só são
        exigidos no momento da publicação — um rascunho pode ser salvo sem eles para revisão posterior.
      </p>
    </form>
  );
}
