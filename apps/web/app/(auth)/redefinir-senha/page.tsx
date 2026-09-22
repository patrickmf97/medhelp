import { AuthForm } from '@/components/auth/auth-form';

export default function ResetPasswordPage() {
  return <div className="auth-card"><span className="eyebrow">Nova credencial</span><h1>Defina uma nova senha</h1><p>Escolha uma senha exclusiva com pelo menos 10 caracteres.</p><AuthForm mode="reset" /></div>;
}
