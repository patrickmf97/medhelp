import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'MEDHELP — Estude medicina com clareza', template: '%s | MEDHELP' },
  description: 'Resumos, flashcards, biblioteca acadêmica e um Atlas 3D interativo para acompanhar sua formação médica.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
