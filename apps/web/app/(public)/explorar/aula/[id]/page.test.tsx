import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getPublicFreeSample } from '@/lib/content/public-catalog';
import SamplePage from './page';

vi.mock('@/lib/content/public-catalog', () => ({ getPublicFreeSample: vi.fn() }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));

describe('free lesson sample', () => {
  it('renders only actual released summary and text blocks', async () => {
    vi.mocked(getPublicFreeSample).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111', slug: 'amostra', title: 'Amostra revisada', summary: 'Resumo editorial.', accessLevel: 'free',
      cycle: 'Ciclo Básico', cycleSlug: 'basico', discipline: 'Anatomia', module: 'Tórax',
      blocks: [{ id: 'b', type: 'rich_text', text: 'Texto publicado.' }],
    });
    render(await SamplePage({ params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) }));
    expect(screen.getByRole('heading', { name: 'Amostra revisada' })).toBeVisible();
    expect(screen.getByText('Texto publicado.')).toBeVisible();
    expect(screen.getByText('Resumo editorial.')).toBeVisible();
  });

  it('does not query malformed lesson identifiers', async () => {
    await expect(SamplePage({ params: Promise.resolve({ id: 'invalid' }) })).rejects.toThrow('NOT_FOUND');
    expect(getPublicFreeSample).not.toHaveBeenCalledWith('invalid');
  });
});
