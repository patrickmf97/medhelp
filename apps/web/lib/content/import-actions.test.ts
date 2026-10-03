import { beforeEach, expect, test, vi } from 'vitest';

const { rpc, requireRole, revalidatePath } = vi.hoisted(() => ({
  rpc: vi.fn(), requireRole: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock('@/lib/auth/require-role', () => ({ requireRole }));
vi.mock('next/cache', () => ({ revalidatePath }));
import { previewImportAction, applyImportAction, publishImportAction } from '@/app/editor/conteudos/importar/actions';

beforeEach(() => {
  vi.resetAllMocks();
  requireRole.mockResolvedValue({ supabase: { rpc } });
});
test('authorization failure cannot call an import RPC', async () => {
  requireRole.mockRejectedValue(new Error('Unauthorized'));
  await expect(previewImportAction('{}')).rejects.toThrow('Unauthorized');
  expect(rpc).not.toHaveBeenCalled();
});
test('preview does not write and only returns a validated report', async () => {
  rpc.mockResolvedValue({ data: { digest: 'a'.repeat(64), create: 83, update: 0, unchanged: 0, conflicts: [], expectedState: 'b'.repeat(64) }, error: null });
  const result = await previewImportAction('{}');
  expect(result).toMatchObject({ ok: true, value: { create: 83 } });
  expect(rpc).toHaveBeenCalledWith('preview_content_import', { bundle: {} });
  expect(revalidatePath).not.toHaveBeenCalled();
});
test('apply requires the exact preview fingerprint', async () => {
  expect(await applyImportAction('{}', 'invalid')).toMatchObject({ ok: false });
  expect(rpc).not.toHaveBeenCalled();
  rpc.mockResolvedValue({ data: { batchId: '9a628f45-5501-45db-8aee-0fc92142479d', create: 83, update: 0, unchanged: 0 }, error: null });
  await applyImportAction('{}', 'b'.repeat(64));
  expect(rpc).toHaveBeenCalledWith('apply_content_import', { bundle: {}, expected_state: 'b'.repeat(64) });
});
test('publication is separate and accepts no bundle or actor override', async () => {
  rpc.mockResolvedValue({ data: { batchId: '9a628f45-5501-45db-8aee-0fc92142479d', state: 'published' }, error: null });
  await publishImportAction('9a628f45-5501-45db-8aee-0fc92142479d', 'c'.repeat(64));
  expect(rpc).toHaveBeenCalledWith('publish_content_import', { batch_id: '9a628f45-5501-45db-8aee-0fc92142479d', expected_state: 'c'.repeat(64) });
  expect(revalidatePath).toHaveBeenCalledWith('/aluno/disciplinas', 'layout');
});
test('database errors never leak raw payloads', async () => {
  rpc.mockResolvedValue({ data: null, error: { code: '40001', message: 'secret lesson text' } });
  expect(await previewImportAction('{}')).toMatchObject({ ok: false, message: expect.stringContaining('O catálogo mudou') });
});
test('rejects oversized or malformed JSON before querying', async () => {
  expect(await previewImportAction('x'.repeat(500_001))).toMatchObject({ ok: false });
  expect(await previewImportAction('{')).toMatchObject({ ok: false });
  expect(rpc).not.toHaveBeenCalled();
});
