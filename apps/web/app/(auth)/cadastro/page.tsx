import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export default function SignupPage() {
  return <div className="auth-card"><span className="eyebrow">Sua jornada começa aqui</span><h1>Crie sua conta</h1><p>Explore os conteúdos gratuitos e prepare sua rotina de estudos.</p><AuthForm mode="signup" /><p className="auth-switch">Já tem uma conta? <Link href="/entrar">Entrar</Link></p></div>;
}
