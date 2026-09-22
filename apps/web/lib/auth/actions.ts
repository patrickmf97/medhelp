'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from './require-role';
import { loginSchema, recoverySchema, resetPasswordSchema, signupSchema } from './schemas';

export type AuthActionState = {
  message?: string;
  success?: boolean;
  errors?: Record<string, string[]>;
} | undefined;

const genericLoginError = 'Não foi possível entrar. Confira seus dados e tente novamente.';
const genericRecoveryMessage = 'Se existir uma conta com este e-mail, enviaremos as instruções de recuperação.';

function validationState(error: { flatten: () => { fieldErrors: Record<string, string[]> } }): AuthActionState {
  return { errors: error.flatten().fieldErrors };
}

export async function loginAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationState(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { message: genericLoginError };

  redirect(safeRedirectPath(parsed.data.next, '/aluno'));
}

export async function signUpAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationState(parsed.error);

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.name,
        terms_version: '2026-09-22',
        privacy_version: '2026-09-22',
      },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent('/aluno')}`,
    },
  });

  if (error) return { message: 'Não foi possível concluir o cadastro. Revise os dados e tente novamente.' };
  return { success: true, message: 'Cadastro recebido. Confira seu e-mail para confirmar a conta.' };
}

export async function recoverPasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = recoverySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationState(parsed.error);

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent('/redefinir-senha')}` });
  return { success: true, message: genericRecoveryMessage };
}

export async function resetPasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationState(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: 'Não foi possível redefinir a senha. Solicite um novo link e tente novamente.' };
  redirect('/entrar?senha=atualizada');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/entrar');
}
