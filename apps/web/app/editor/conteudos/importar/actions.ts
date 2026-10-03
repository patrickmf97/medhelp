'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';

const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const counts = { create: z.number().int().nonnegative(), update: z.number().int().nonnegative(), unchanged: z.number().int().nonnegative() };
const previewSchema = z.object({ ...counts, digest: fingerprint, expectedState: fingerprint, conflicts: z.array(z.object({ editorialId: z.string(), reason: z.string() })) });
const appliedSchema = z.object({ ...counts, batchId: z.uuid() });

function bundleInput(value: string) {
  if (typeof value !== 'string' || value.length > 500_000) throw new Error('Selecione um pacote JSON de até 500 KB.');
  try { return JSON.parse(value); } catch { throw new Error('O pacote não contém JSON válido.'); }
}

class SafeImportError extends Error {}
function importError(code?: string): never {
  if (code === '40001') throw new SafeImportError('O catálogo mudou. Faça uma nova simulação e confira os conflitos antes de continuar.');
  if (code === 'PGRST202') throw new SafeImportError('A importação ainda não foi configurada no banco.');
  throw new SafeImportError('Operação recusada. Confira o pacote, sua permissão e o estado editorial.');
}

async function safeResult<T>(action: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  try { return { ok: true, value: await action() }; }
  catch (error) {
    return { ok: false, message: error instanceof SafeImportError ? error.message : 'Pacote ou resposta inválida. Confira o arquivo e tente uma nova simulação.' };
  }
}

export async function previewImportAction(value: string) {
  const { supabase } = await requireRole(['editor', 'admin'], '/editor/conteudos/importar');
  return safeResult(async () => {
  const { data, error } = await supabase.rpc('preview_content_import', { bundle: bundleInput(value) });
  if (error) importError(error.code);
  return previewSchema.parse(data);
  });
}

export async function applyImportAction(value: string, expectedState: string) {
  const { supabase } = await requireRole(['editor', 'admin'], '/editor/conteudos/importar');
  return safeResult(async () => {
  const { data, error } = await supabase.rpc('apply_content_import', { bundle: bundleInput(value), expected_state: fingerprint.parse(expectedState) });
  if (error) importError(error.code);
  revalidatePath('/editor/conteudos');
  return appliedSchema.parse(data);
  });
}

export async function publishImportAction(batchId: string, expectedState: string) {
  const { supabase } = await requireRole(['editor', 'admin'], '/editor/conteudos/importar');
  return safeResult(async () => {
  const { data, error } = await supabase.rpc('publish_content_import', { batch_id: z.uuid().parse(batchId), expected_state: fingerprint.parse(expectedState) });
  if (error) importError(error.code);
  const result = z.object({ batchId: z.uuid(), state: z.literal('published') }).parse(data);
  revalidatePath('/editor/conteudos');
  revalidatePath('/explorar');
  revalidatePath('/aluno/disciplinas', 'layout');
  return result;
  });
}
