'use client';

import { Button, Field } from '@medhelp/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import type { AuthActionState } from '@/lib/auth/actions';
import { loginAction, recoverPasswordAction, resetPasswordAction, signUpAction } from '@/lib/auth/actions';

type Mode = 'login' | 'signup' | 'recover' | 'reset';

const actions = { login: loginAction, signup: signUpAction, recover: recoverPasswordAction, reset: resetPasswordAction };

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(actions[mode], undefined);
  const error = (field: string) => state?.errors?.[field]?.[0];

  return (
    <form action={formAction} className="auth-form">
      {mode === 'signup' ? <Field autoComplete="name" error={error('name')} label="Nome completo" name="name" required /> : null}
      <Field autoComplete="email" error={error('email')} label="E-mail" name="email" required type="email" />
      {mode !== 'recover' ? <Field autoComplete={mode === 'reset' ? 'new-password' : 'current-password'} error={error('password')} hint="Use pelo menos 10 caracteres." label={mode === 'reset' ? 'Nova senha' : 'Senha'} minLength={10} name="password" required type="password" /> : null}
      {mode === 'login' ? <><input name="next" type="hidden" value={next} /><div className="auth-form__row"><label><input name="remember" type="checkbox" /> Manter conectado</label><Link href="/recuperar-senha">Esqueci minha senha</Link></div></> : null}
      {mode === 'signup' ? <label className="terms-check"><input aria-describedby="accepted-error" name="accepted" required type="checkbox" /><span>Aceito os <Link href="/termos">Termos de uso</Link> e a <Link href="/privacidade">Política de privacidade</Link>.</span>{error('accepted') ? <small id="accepted-error" role="alert">{error('accepted')}</small> : null}</label> : null}
      {state?.message ? <p aria-live="polite" className={state.success ? 'auth-message auth-message--success' : 'mh-error-message'}>{state.message}</p> : null}
      <Button disabled={pending} type="submit">{pending ? 'Aguarde…' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar minha conta' : mode === 'recover' ? 'Enviar instruções' : 'Salvar nova senha'}</Button>
    </form>
  );
}
