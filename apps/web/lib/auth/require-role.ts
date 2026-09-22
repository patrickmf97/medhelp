import { APP_ROLES, type AppRole } from '@medhelp/domain';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\') || /[\u0000-\u001F]/.test(decoded)) return fallback;
    return value;
  } catch {
    return fallback;
  }
}

export async function requireUser(destination = '/aluno') {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    const next = encodeURIComponent(safeRedirectPath(destination, '/aluno'));
    redirect(`/entrar?next=${next}`);
  }

  return { supabase, user: data.user };
}

export async function requireRole(allowed: readonly AppRole[], destination = '/admin') {
  const { supabase, user } = await requireUser(destination);
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id);

  if (error) redirect('/acesso-negado');

  const roles = (data ?? [])
    .map(({ role }) => role)
    .filter((role): role is AppRole => APP_ROLES.includes(role as AppRole));

  if (!roles.some((role) => allowed.includes(role))) redirect('/acesso-negado');
  return { supabase, user, roles };
}
