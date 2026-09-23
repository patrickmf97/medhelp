import type { ReactNode } from 'react';
import { Footer } from '@/components/public/footer';
import { Header } from '@/components/public/header';
import { MotionShell } from '@/components/public/motion-shell';

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <MotionShell><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><Header /><main id="conteudo">{children}</main><Footer /></MotionShell>;
}
