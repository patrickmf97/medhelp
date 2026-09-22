'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './button';

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog className="mh-dialog" onCancel={onClose} onClose={onClose} ref={ref}>
      <div className="mh-dialog__header"><h2>{title}</h2><Button aria-label="Fechar" onClick={onClose} variant="ghost">×</Button></div>
      {children}
    </dialog>
  );
}
