import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/src/site-config';
import { listPublicCatalog } from '@/lib/content/public-catalog';

/** Static public routes that exist regardless of catalog content. */
const STATIC_ROUTES: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/explorar', changeFrequency: 'daily', priority: 0.8 },
  { path: '/termos', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacidade', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/creditos-e-licencas', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/contato', changeFrequency: 'yearly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  // Only free lessons have a publicly reachable preview page
  // (apps/web/app/(public)/explorar/aula/[id]/page.tsx); premium lessons are not listed.
  let freeLessonEntries: MetadataRoute.Sitemap = [];
  try {
    const catalog = await listPublicCatalog();
    freeLessonEntries = catalog
      .filter((item) => item.accessLevel === 'free')
      .map((item) => ({
        url: `${siteUrl}/explorar/aula/${item.id}`,
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
  } catch {
    // The catalog is unavailable (e.g. no database connection at build time);
    // fall back to the static routes rather than failing the whole sitemap.
    freeLessonEntries = [];
  }

  return [...staticEntries, ...freeLessonEntries];
}
