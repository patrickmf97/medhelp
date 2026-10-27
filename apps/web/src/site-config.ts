export const siteConfig = {
  name: 'MEDHELP',
  headline: 'Medicina é difícil. Estudar não precisa ser.',
  description:
    'Resumos, flashcards, biblioteca acadêmica e um Atlas 3D interativo reunidos em uma plataforma criada para acompanhar toda a sua formação médica.',
  monthlyPriceCents: 3000,
  locale: 'pt-BR',
} as const;

const DEFAULT_SITE_URL = 'http://localhost:3000';

/** Canonical application origin, used for sitemap/robots and e-mail redirect URLs. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) return DEFAULT_SITE_URL;
  return configured.endsWith('/') ? configured.slice(0, -1) : configured;
}
