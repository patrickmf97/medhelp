'use client';

import { useState } from 'react';
import { createMediaUploadAction, registerAttachmentAction } from '@/app/editor/conteudos/actions';

type UploadState = 'idle' | 'signing' | 'uploading' | 'done' | 'error';

export function MediaUploader({ lessonId }: { lessonId: string }) {
  const [state, setState] = useState<UploadState>('idle');
  const [message, setMessage] = useState('PDF, imagens ou vídeo. O arquivo vai direto ao armazenamento privado.');

  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      setState('signing');
      setMessage('Preparando envio seguro…');
      const signed = await createMediaUploadAction({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });
      setState('uploading');
      setMessage('Enviando mídia…');
      const response = await fetch(signed.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!response.ok) throw new Error('Falha no envio');
      await registerAttachmentAction({
        lessonId,
        title: file.name,
        objectKey: signed.objectKey,
        mimeType: file.type,
        size: file.size,
        receipt: signed.receipt,
      });
      setState('done');
      setMessage(`Arquivo enviado: ${signed.objectKey}`);
    } catch {
      setState('error');
      setMessage('Não foi possível enviar. Confira o formato, o tamanho e tente novamente.');
    }
  }

  return (
    <div className="media-uploader">
      <label className="mh-field">
        <span className="mh-field__label">Adicionar mídia</span>
        <input
          accept="application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/webm"
          disabled={state === 'signing' || state === 'uploading'}
          onChange={(event) => void upload(event.target.files?.[0])}
          type="file"
        />
      </label>
      <small className={state === 'error' ? 'mh-field__error' : 'mh-field__hint'} aria-live="polite">
        {message}
      </small>
    </div>
  );
}
