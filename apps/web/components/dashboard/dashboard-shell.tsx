import { buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { signOutAction } from '@/lib/auth/actions';
import { Logo } from '@/components/public/logo';

export function DashboardShell({ area, children }: { area: 'Aluno' | 'Editorial' | 'Admin'; children: ReactNode }) {
  const admin = area === 'Admin';
  const editorial = area === 'Editorial';
  const links: ReadonlyArray<readonly [string, string]> = admin ? [['Visão geral', '/admin'], ['Conteúdos', '/editor/conteudos'], ['Pagamentos', '/admin/pagamentos']] : editorial ? [['Conteúdos', '/editor/conteudos'], ['Ver plataforma', '/explorar']] : [['Hoje', '/aluno'], ['Explorar', '/explorar'], ['Meu progresso', '/aluno/progresso']];
  return <div className="dashboard-shell"><aside><Logo /><span className="dashboard-shell__area">Área {area === 'Aluno' ? 'do Aluno' : area}</span><nav aria-label={`Navegação ${area}`}>{links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav><form action={signOutAction}><button className={buttonClassName('ghost')} type="submit">Sair</button></form></aside><div className="dashboard-main"><header><strong>{admin ? 'Administração MEDHELP' : editorial ? 'Conteúdo MEDHELP' : 'Minha jornada MEDHELP'}</strong><span>Ambiente protegido</span></header><main>{children}</main></div></div>;
}
