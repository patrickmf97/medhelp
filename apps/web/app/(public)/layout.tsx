import type { ReactNode } from 'react';
import { Footer } from '@/components/public/footer';
import { Header } from '@/components/public/header';

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><Header /><main id="conteudo">{children}</main><Footer /></>;
}
