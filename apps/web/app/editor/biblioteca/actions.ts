'use server';

import type { ContentStatus } from '@medhelp/domain';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import {
  createEbook,
  transitionEbook,
  updateEbook,
  type EbookFileInput,
} from '@/lib/content/ebook-repository';
import { ebookFileSchema, ebookSchema, ebookTransitionSchema } from '@/lib/content/ebook-schemas';
import {
  createUploadReceipt,
  prepareMediaUpload,
  signR2Upload,
} from '@/lib/storage/media-upload';

const EBOOK_MIME_TYPES = new Set(['application/pdf']);

function ebookMetadataInput(formData: FormData) {
  return ebookSchema.parse({
    title: formData.get('title'),
    slug: formData.get('slug'),
    author: formData.get('author'),
    description: formData.get('description') ?? '',
    source: formData.get('source'),
    licenseType: formData.get('licenseType') ?? '',
    licenseUrl: formData.get('licenseUrl') ?? '',
    accessLevel: formData.get('accessLevel'),
    position: formData.get('position') ?? 0,
  });
}

function ebookFileInput(formData: FormData): EbookFileInput {
  return {
    objectKey: String(formData.get('objectKey') ?? ''),
    mimeType: String(formData.get('mimeType') ?? ''),
    size: Number(formData.get('size') ?? 0),
    receipt: String(formData.get('receipt') ?? ''),
  };
}

export async function createEbookUploadAction(input: { fileName: string; mimeType: string; size: number }) {
  const parsed = ebookFileSchema.parse(input);
  if (!EBOOK_MIME_TYPES.has(parsed.mimeType)) throw new Error('Envie o ebook em PDF.');
  const { user } = await requireRole(['editor', 'admin'], '/editor/biblioteca/novo');
  const upload = prepareMediaUpload({ actorId: user.id, ...parsed });
  const configuration = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
  };

  if (Object.values(configuration).some((value) => !value)) {
    throw new Error('Armazenamento de mídia não configurado.');
  }

  const signed = signR2Upload(upload, configuration as Record<keyof typeof configuration, string>);
  return {
    ...signed,
    receipt: createUploadReceipt(upload, signed.expiresAt, configuration.secretAccessKey as string),
  };
}

export async function createEbookAction(formData: FormData) {
  const metadata = ebookMetadataInput(formData);
  const file = ebookFileInput(formData);
  const ebook = await createEbook(metadata, file);
  revalidatePath('/editor/biblioteca');
  redirect(`/editor/biblioteca/${ebook.id}`);
}

export async function updateEbookAction(id: string, formData: FormData) {
  const metadata = ebookMetadataInput(formData);
  const ebook = await updateEbook(id, metadata);
  revalidatePath('/editor/biblioteca');
  revalidatePath(`/editor/biblioteca/${id}`);
  redirect(`/editor/biblioteca/${ebook.id}?salvo=1`);
}

export async function transitionEbookAction(id: string, target: ContentStatus) {
  const parsed = ebookTransitionSchema.parse({ ebookId: id, target });
  await transitionEbook(parsed.ebookId, parsed.target);
  revalidatePath('/editor/biblioteca');
  revalidatePath(`/editor/biblioteca/${id}`);
  revalidatePath('/biblioteca');
}
