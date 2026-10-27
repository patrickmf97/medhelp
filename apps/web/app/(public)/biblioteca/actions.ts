'use server';

import { z } from 'zod';
import { requestEbookDownload } from '@/lib/content/ebook-catalog';

const ebookIdSchema = z.string().uuid();

export async function requestEbookDownloadAction(ebookId: string) {
  const parsed = ebookIdSchema.parse(ebookId);
  return requestEbookDownload(parsed);
}
