import { transitionContent, validateEbookLicense, type AccessLevel, type ContentStatus } from '@medhelp/domain';
import { requireRole } from '@/lib/auth/require-role';
import { verifyUploadReceipt } from '@/lib/storage/media-upload';

export interface EditorialEbook {
  id: string;
  title: string;
  slug: string;
  author: string;
  description: string | null;
  source: string;
  license_type: string | null;
  license_url: string | null;
  cover_object_key: string | null;
  file_object_key: string;
  mime_type: string;
  size_bytes: number;
  access_level: AccessLevel;
  status: ContentStatus;
  position: number;
  published_at: string | null;
  archived_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EbookMetadataInput {
  title: string;
  slug: string;
  author: string;
  description: string | null;
  source: string;
  licenseType: string | null;
  licenseUrl: string | null;
  accessLevel: AccessLevel;
  position: number;
}

export interface EbookFileInput {
  objectKey: string;
  mimeType: string;
  size: number;
  receipt: string;
}

function verifyEbookFile(input: EbookFileInput, actorId: string, fileName: string): void {
  if (!input.objectKey.startsWith(`content/${actorId}/`)) {
    throw new Error('Arquivo de ebook inválido.');
  }
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!secret) throw new Error('Armazenamento de mídia não configurado.');
  verifyUploadReceipt(
    input.receipt,
    { objectKey: input.objectKey, mimeType: input.mimeType, size: input.size },
    secret,
  );
  void fileName;
}

export async function listEditorialEbooks(): Promise<EditorialEbook[]> {
  const { supabase } = await requireRole(['editor', 'admin'], '/editor/biblioteca');
  const { data, error } = await supabase
    .from('ebooks')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar a biblioteca editorial.');
  return (data ?? []) as unknown as EditorialEbook[];
}

export async function getEditorialEbook(id: string): Promise<EditorialEbook | null> {
  const { supabase } = await requireRole(['editor', 'admin'], `/editor/biblioteca/${id}`);
  const { data, error } = await supabase
    .from('ebooks')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error('Não foi possível carregar o ebook.');
  return data as unknown as EditorialEbook | null;
}

export async function createEbook(input: EbookMetadataInput, file: EbookFileInput): Promise<EditorialEbook> {
  const { supabase, user } = await requireRole(['editor', 'admin'], '/editor/biblioteca/novo');
  verifyEbookFile(file, user.id, input.title);
  const { data, error } = await supabase
    .from('ebooks')
    .insert({
      title: input.title,
      slug: input.slug,
      author: input.author,
      description: input.description,
      source: input.source,
      license_type: input.licenseType,
      license_url: input.licenseUrl,
      file_object_key: file.objectKey,
      mime_type: file.mimeType,
      size_bytes: file.size,
      access_level: input.accessLevel,
      position: input.position,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Não foi possível criar o ebook.');
  return data as unknown as EditorialEbook;
}

export async function updateEbook(id: string, input: EbookMetadataInput): Promise<EditorialEbook> {
  const { supabase, user } = await requireRole(['editor', 'admin'], `/editor/biblioteca/${id}`);
  const { data, error } = await supabase
    .from('ebooks')
    .update({
      title: input.title,
      slug: input.slug,
      author: input.author,
      description: input.description,
      source: input.source,
      license_type: input.licenseType,
      license_url: input.licenseUrl,
      access_level: input.accessLevel,
      position: input.position,
      updated_by: user.id,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Não foi possível atualizar o ebook.');
  return data as unknown as EditorialEbook;
}

export async function transitionEbook(id: string, target: ContentStatus): Promise<EditorialEbook> {
  const { supabase, user } = await requireRole(['editor', 'admin'], `/editor/biblioteca/${id}`);
  const { data: current, error: readError } = await supabase
    .from('ebooks')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (readError || !current) throw new Error('Ebook não encontrado.');
  const row = current as unknown as EditorialEbook;
  transitionContent(row.status, target);

  if (target === 'published') {
    const validation = validateEbookLicense({
      author: row.author,
      source: row.source,
      licenseType: row.license_type ?? '',
      licenseUrl: row.license_url ?? '',
    });
    if (!validation.ok) {
      throw new Error(`Não é possível publicar sem metadados de direitos completos: ${validation.errors.join(' ')}`);
    }
  }

  const { data, error } = await supabase
    .from('ebooks')
    .update({ status: target, updated_by: user.id })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Não foi possível alterar o status do ebook.');
  return data as unknown as EditorialEbook;
}

export async function archiveEbook(id: string): Promise<void> {
  const { supabase, user } = await requireRole(['editor', 'admin'], `/editor/biblioteca/${id}`);
  const { error } = await supabase
    .from('ebooks')
    .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', id);

  if (error) throw new Error('Não foi possível remover o ebook.');
}
