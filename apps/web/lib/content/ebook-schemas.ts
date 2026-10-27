import { ACCESS_LEVELS, CONTENT_STATUSES, EBOOK_LICENSE_TYPES } from '@medhelp/domain';
import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ebookSchema = z.object({
  title: z.string().trim().min(2, 'Informe um título.').max(180),
  slug: z.string().trim().min(2).max(180).regex(slugPattern, 'Use letras minúsculas, números e hífens.'),
  author: z.string().trim().min(2, 'Informe o autor.').max(180),
  description: z.string().trim().max(2_000).transform((value) => value || null),
  source: z.string().trim().min(2, 'Informe a fonte do material.').max(280),
  licenseType: z.string().trim().transform((value) => value || null).nullable().refine(
    (value) => value === null || (EBOOK_LICENSE_TYPES as readonly string[]).includes(value),
    'Tipo de licença inválido.',
  ),
  licenseUrl: z.string().trim().max(2_000).transform((value) => value || null),
  accessLevel: z.enum(ACCESS_LEVELS),
  position: z.coerce.number().int().min(0).max(10_000),
});

export const ebookTransitionSchema = z.object({
  ebookId: z.string().uuid(),
  target: z.enum(CONTENT_STATUSES),
});

export const ebookFileSchema = z.object({
  fileName: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().positive(),
});
