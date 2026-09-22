'use client';

import { buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Logo } from './logo';

const links = [
  ['Recursos', '#recursos'],
  ['Atlas 3D', '#atlas'],
  ['Disciplinas', '#disciplinas'],
  ['Biblioteca', '#biblioteca'],
  ['Preço', '#preco'],
  ['FAQ', '#faq'],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Logo />
        <nav aria-label="Navegação principal" className="desktop-nav">
          {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="login-link" href="/entrar">Entrar</Link>
          <Link className={buttonClassName('primary', 'header-cta')} href="/cadastro">Começar agora</Link>
        </div>
        <button aria-expanded={open} aria-label={open ? 'Fechar menu' : 'Abrir menu'} className="menu-toggle" onClick={() => setOpen((value) => !value)} ref={closeRef} type="button">
          <span aria-hidden="true">{open ? '×' : '☰'}</span>
        </button>
      </div>
      <nav aria-label="Navegação móvel" className="mobile-nav" hidden={!open}>
        {links.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link href="/entrar">Entrar</Link>
        <Link className={buttonClassName()} href="/cadastro">Começar agora</Link>
      </nav>
    </header>
  );
}
