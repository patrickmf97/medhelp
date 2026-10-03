import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
const { preview, apply, publish } = vi.hoisted(() => ({ preview: vi.fn(), apply: vi.fn(), publish: vi.fn() }));
vi.mock('@/app/editor/conteudos/importar/actions', () => ({ previewImportAction: preview, applyImportAction: apply, publishImportAction: publish }));
import { ImportPanel } from './import-panel';

test('a conflicting preview cannot be imported or published', async () => {
  preview.mockResolvedValue({ ok: true, value: { create: 0, update: 1, unchanged: 82, digest: 'a'.repeat(64), expectedState: 'b'.repeat(64), conflicts: [{ editorialId: 'CH-01', reason: 'manual edit' }] } });
  render(<ImportPanel />);
  const file = new File(['{}'], 'bundle.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => '{}' });
  fireEvent.change(screen.getByLabelText('Pacote de aulas'), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Simular importação' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Simular importação' }));
  expect(await screen.findByText(/manual edit/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Importar para revisão' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Publicar lote' })).toBeNull();
  expect(apply).not.toHaveBeenCalled();
  expect(publish).not.toHaveBeenCalled();
});
