import { buttonClassName } from '@medhelp/ui';
import Link from 'next/link';

export default function AccessDeniedPage() {
  return <div className="auth-card"><span className="eyebrow">Acesso protegido</span><h1>Você não tem permissão para esta área</h1><p>Volte ao seu painel ou entre com uma conta que possua a permissão necessária.</p><Link className={buttonClassName('secondary')} href="/aluno">Ir para o painel</Link></div>;
}
