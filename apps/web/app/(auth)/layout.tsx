import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Logo } from '@/components/public/logo';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <main className="auth-layout"><section className="auth-brand"><Logo /><div><span className="eyebrow">Estude com direção</span><p>“Uma plataforma para transformar volume de conteúdo em clareza.”</p></div></section><section className="auth-panel">{children}</section></main>;
}
