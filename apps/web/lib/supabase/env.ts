function requirePublicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável pública obrigatória ausente: ${name}`);
  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: requirePublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    publishableKey: requirePublicEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  };
}
