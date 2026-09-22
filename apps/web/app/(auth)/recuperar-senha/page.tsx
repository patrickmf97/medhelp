import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export default function RecoveryPage() {
  return <div className="auth-card"><span className="eyebrow">Recuperação segura</span><h1>Recupere sua senha</h1><p>Se existir uma conta com o e-mail informado, enviaremos um link seguro para redefinição.</p><AuthForm mode="recover" /><p className="auth-switch"><Link href="/entrar">Voltar para entrar</Link></p></div>;
}
