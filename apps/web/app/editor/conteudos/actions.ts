'use server';

import type { ContentStatus } from '@medhelp/domain';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import {
  createLesson,
  transitionLesson,
  updateLesson,
} from '@/lib/content/repository';
import { lessonSchema, mediaUploadSchema, transitionSchema } from '@/lib/content/schemas';
import {
  createUploadReceipt,
  prepareMediaUpload,
  signR2Upload,
  verifyUploadReceipt,
} from '@/lib/storage/media-upload';

function lessonInput(formData: FormData) {
  return lessonSchema.parse({
    moduleId: formData.get('moduleId'),
    title: formData.get('title'),
    slug: formData.get('slug'),
    summary: formData.get('summary') ?? '',
    accessLevel: formData.get('accessLevel'),
    position: formData.get('position') ?? 0,
    scheduledFor: formData.get('scheduledFor') ?? '',
  });
}

export async function createLessonAction(formData: FormData) {
  const lesson = await createLesson(lessonInput(formData));
  revalidatePath('/editor/conteudos');
  redirect(`/editor/conteudos/${lesson.id}`);
}

export async function updateLessonAction(id: string, formData: FormData) {
  const lesson = await updateLesson(id, lessonInput(formData));
  revalidatePath('/editor/conteudos');
  revalidatePath(`/editor/conteudos/${id}`);
  redirect(`/editor/conteudos/${lesson.id}?salvo=1`);
}

export async function transitionLessonAction(id: string, target: ContentStatus) {
  const parsed = transitionSchema.parse({ lessonId: id, target });
  await transitionLesson(parsed.lessonId, parsed.target);
  revalidatePath('/editor/conteudos');
  revalidatePath(`/editor/conteudos/${id}`);
}

export async function createMediaUploadAction(input: {
  fileName: string;
  mimeType: string;
  size: number;
}) {
  const parsed = mediaUploadSchema.parse(input);
  const { user } = await requireRole(['editor', 'admin'], '/editor/conteudos');
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

export async function registerAttachmentAction(input: {
  lessonId: string;
  title: string;
  objectKey: string;
  mimeType: string;
  size: number;
  receipt: string;
}) {
  const parsed = mediaUploadSchema.extend({
    lessonId: transitionSchema.shape.lessonId,
    title: lessonSchema.shape.title,
    objectKey: mediaUploadSchema.shape.fileName,
    receipt: z.string().min(40).max(2_000),
  }).parse({ ...input, fileName: input.title });
  const { supabase, user } = await requireRole(['editor', 'admin'], `/editor/conteudos/${parsed.lessonId}`);
  if (!parsed.objectKey.startsWith(`content/${user.id}/`)) throw new Error('Objeto de mídia inválido.');
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!secret) throw new Error('Armazenamento de mídia não configurado.');
  prepareMediaUpload({ actorId: user.id, fileName: parsed.title, mimeType: parsed.mimeType, size: parsed.size });
  verifyUploadReceipt(parsed.receipt, {
    objectKey: parsed.objectKey,
    mimeType: parsed.mimeType,
    size: parsed.size,
  }, secret);
  const { error } = await supabase.from('attachments').insert({
    lesson_id: parsed.lessonId,
    title: parsed.title,
    object_key: parsed.objectKey,
    mime_type: parsed.mimeType,
    size_bytes: parsed.size,
    created_by: user.id,
  });
  if (error) throw new Error('Não foi possível registrar o anexo.');
  revalidatePath(`/editor/conteudos/${parsed.lessonId}`);
}
