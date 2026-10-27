import { createClient } from '@/lib/supabase/server';
import { createSignedDownload } from '@/lib/storage/signed-files';

export interface PublicEbook {
  id: string;
  title: string;
  slug: string;
  author: string;
  description: string | null;
  source: string;
  licenseType: string | null;
  licenseUrl: string | null;
  accessLevel: 'free' | 'premium';
  publishedAt: string | null;
}

type UnknownRecord = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function mapEbookRow(row: UnknownRecord): PublicEbook | null {
  const id = asString(row.id);
  const title = asString(row.title);
  const slug = asString(row.slug);
  const author = asString(row.author);
  const source = asString(row.source);
  const accessLevel = row.access_level;
  if (!id || !title || !slug || !author || !source || (accessLevel !== 'free' && accessLevel !== 'premium')) {
    return null;
  }
  return {
    id,
    title,
    slug,
    author,
    description: asString(row.description),
    source,
    licenseType: asString(row.license_type),
    licenseUrl: asString(row.license_url),
    accessLevel,
    publishedAt: asString(row.published_at),
  };
}

/**
 * Public/student catalog listing. Relies entirely on the `ebooks` RLS
 * policies for authorization: anonymous visitors and students without an
 * active subscription only ever receive free, published rows back from
 * Postgres — this function does not re-implement that logic in the app.
 */
export async function listEbookCatalog(): Promise<PublicEbook[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ebooks')
    .select('id, title, slug, author, description, source, license_type, license_url, access_level, published_at')
    .is('deleted_at', null)
    .order('position')
    .order('published_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar a biblioteca.');
  return (data ?? []).flatMap((row) => {
    const mapped = mapEbookRow(row as UnknownRecord);
    return mapped ? [mapped] : [];
  });
}

export interface EbookDownload {
  downloadUrl: string;
  expiresAt: string;
}

/**
 * Requests a short-lived signed download for an ebook. The row lookup goes
 * through the same RLS policy as the catalog, so a visitor who is not
 * entitled to a premium ebook gets a generic "not available" error instead
 * of a signed URL — entitlement is never re-checked in application code.
 */
export async function requestEbookDownload(ebookId: string): Promise<EbookDownload> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ebooks')
    .select('title, file_object_key, mime_type')
    .eq('id', ebookId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) throw new Error('Este ebook não está disponível para download.');

  const configuration = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
  };
  if (Object.values(configuration).some((value) => !value)) {
    throw new Error('Armazenamento de mídia não configurado.');
  }

  const row = data as { title: string; file_object_key: string; mime_type: string };
  const extension = row.file_object_key.split('.').pop();
  const fileName = extension ? `${row.title}.${extension}` : row.title;
  return createSignedDownload(row.file_object_key, fileName, configuration as Record<keyof typeof configuration, string>);
}
