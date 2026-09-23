'use client';

import { buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Logo } from './logo';

const links = [
  ['Recursos', '/#recursos'],
  ['Atlas 3D', '/#atlas'],
  ['Disciplinas', '/#disciplinas'],
  ['Biblioteca', '/#biblioteca'],
  ['Preço', '/#preco'],
  ['FAQ', '/#faq'],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const readingProgressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  useEffect(() => {
    const updateProgress = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const progress = available > 0 ? Math.min(window.scrollY / available, 1) : 0;
      readingProgressRef.current?.style.setProperty('transform', `scaleX(${progress})`);
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  return (
    <header className="site-header" data-menu-open={open}>
      <span
        aria-hidden="true"
        className="reading-progress"
        ref={readingProgressRef}
      />
      <div className="container site-header__inner">
        <Logo />
        <nav aria-label="Navegação principal" className="desktop-nav">
          {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="login-link" href="/entrar">Entrar</Link>
          <Link className={buttonClassName('primary', 'header-cta')} href="/cadastro">Começar agora</Link>
        </div>
        <button aria-controls="mobile-navigation" aria-expanded={open} aria-label={open ? 'Fechar menu' : 'Abrir menu'} className="menu-toggle" onClick={() => setOpen((value) => !value)} ref={toggleRef} type="button">
          <span aria-hidden="true" className="menu-toggle__icon"><i /><i /></span>
        </button>
      </div>
      <nav aria-label="Navegação móvel" className="mobile-nav" hidden={!open} id="mobile-navigation">
        {links.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link href="/entrar">Entrar</Link>
        <Link className={buttonClassName()} href="/cadastro">Começar agora</Link>
      </nav>
    </header>
  );
}
