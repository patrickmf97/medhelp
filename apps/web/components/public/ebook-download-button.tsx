'use client';

import { buttonClassName } from '@medhelp/ui';
import { useState, useTransition } from 'react';
import { requestEbookDownloadAction } from '@/app/(public)/biblioteca/actions';

export function EbookDownloadButton({ ebookId, title }: { ebookId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  function download() {
    startTransition(async () => {
      try {
        setMessage('');
        const result = await requestEbookDownloadAction(ebookId);
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
      } catch {
        setMessage('Não foi possível gerar o link de download agora. Tente novamente.');
      }
    });
  }

  return (
    <div className="ebook-card__download">
      <button aria-label={`Baixar ${title}`} className={buttonClassName('secondary')} disabled={pending} onClick={download} type="button">
        {pending ? 'Gerando link…' : 'Baixar'}
      </button>
      {message ? <p className="mh-error-message" role="status">{message}</p> : null}
    </div>
  );
}
