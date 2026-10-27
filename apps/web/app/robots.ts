import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/src/site-config';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Authenticated areas and account flows carry no public SEO value and
      // must stay out of the public index (see spec section 17). Robots.txt
      // matching is a plain path-prefix, so these cover both the bare route
      // and any nested sub-route (e.g. "/aluno" also matches "/aluno/resumos").
      disallow: ['/aluno', '/admin', '/editor', '/auth', '/entrar', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/acesso-negado'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
