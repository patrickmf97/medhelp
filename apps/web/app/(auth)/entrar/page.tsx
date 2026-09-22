import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { safeRedirectPath } from '@/lib/auth/require-role';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; senha?: string }> }) {
  const query = await searchParams;
  return <div className="auth-card"><span className="eyebrow">Bem-vindo de volta</span><h1>Entre na sua conta</h1><p>Continue seus estudos exatamente de onde parou.</p>{query.senha ? <p className="auth-message auth-message--success">Senha atualizada. Entre com suas novas credenciais.</p> : null}<AuthForm mode="login" next={safeRedirectPath(query.next, '/aluno')} /><p className="auth-switch">Ainda não tem conta? <Link href="/cadastro">Comece agora</Link></p></div>;
}
