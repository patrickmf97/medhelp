import { ACCESS_LEVELS, CONTENT_STATUSES } from '@medhelp/domain';
import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const lessonSchema = z.object({
  moduleId: z.string().uuid('Selecione um módulo válido.'),
  title: z.string().trim().min(2, 'Informe um título.').max(180),
  slug: z.string().trim().min(2).max(180).regex(slugPattern, 'Use letras minúsculas, números e hífens.'),
  summary: z.string().trim().max(2_000).transform((value) => value || null),
  accessLevel: z.enum(ACCESS_LEVELS),
  position: z.coerce.number().int().min(0).max(10_000),
  scheduledFor: z.string().trim().transform((value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error('Data de publicação inválida.');
    return date.toISOString();
  }),
});

export const transitionSchema = z.object({
  lessonId: z.string().uuid(),
  target: z.enum(CONTENT_STATUSES),
});

export const mediaUploadSchema = z.object({
  fileName: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().positive(),
});
