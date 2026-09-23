import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createClient } from '@/lib/supabase/server';
import { getPublicFreeSample, listPublicCatalog, mapPublicCatalogRows } from './public-catalog';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

describe('public catalog mapping', () => {
  it('maps released lesson relationships into serializable public items', () => {
    const items = mapPublicCatalogRows([
      {
        id: 'lesson-1',
        title: 'Introdução à anatomia cardíaca',
        slug: 'introducao-anatomia-cardiaca',
        summary: 'Uma visão inicial da organização do estudo.',
        access_level: 'free',
        modules: {
          title: 'Tórax',
          disciplines: {
            title: 'Anatomia',
            cycles: { title: 'Ciclo Básico', slug: 'basico' },
          },
        },
      },
    ]);

    expect(items).toEqual([
      {
        id: 'lesson-1',
        title: 'Introdução à anatomia cardíaca',
        slug: 'introducao-anatomia-cardiaca',
        summary: 'Uma visão inicial da organização do estudo.',
        accessLevel: 'free',
        module: 'Tórax',
        discipline: 'Anatomia',
        cycle: 'Ciclo Básico',
        cycleSlug: 'basico',
      },
    ]);
  });

  it('drops malformed rows instead of exposing broken cards', () => {
    expect(
      mapPublicCatalogRows([
        {
          id: 'broken',
          title: 'Registro incompleto',
          slug: 'registro-incompleto',
          summary: null,
          access_level: 'premium',
          modules: null,
        },
      ]),
    ).toEqual([]);
  });
});

describe('public catalog query', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters release state explicitly and fetches beyond the first page', async () => {
    const calls: string[] = [];
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((field: string, value: string) => { calls.push(`${field}=${value}`); return builder; }),
      lte: vi.fn((field: string) => { calls.push(`${field}<=now`); return builder; }),
      is: vi.fn((field: string) => { calls.push(`${field}=null`); return builder; }),
      order: vi.fn(() => builder),
      range: vi.fn(async (start: number) => ({
        data: start === 0 ? Array.from({ length: 1000 }, (_, index) => ({
          id: `lesson-${index}`, title: 'Aula', slug: `aula-${index}`, access_level: 'free',
          modules: { title: 'Módulo', disciplines: { title: 'Disciplina', cycles: { title: 'Ciclo', slug: 'basico' } } },
        })) : [{
          id: 'lesson-1000', title: 'Aula final', slug: 'aula-final', access_level: 'free',
          modules: { title: 'Módulo', disciplines: { title: 'Disciplina', cycles: { title: 'Ciclo', slug: 'basico' } } },
        }], error: null,
      })),
    };
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as never);

    const result = await listPublicCatalog();

    expect(calls).toContain('status=published');
    expect(calls).toContain('deleted_at=null');
    expect(calls).toContain('published_at<=now');
    expect(builder.range).toHaveBeenCalledWith(0, 999);
    expect(builder.range).toHaveBeenCalledWith(1000, 1999);
    expect(result).toHaveLength(1001);
  });

  it('reads only a published, current, undeleted free lesson by id', async () => {
    const calls: string[] = [];
    const row = {
      id: '11111111-1111-4111-8111-111111111111', title: 'Amostra', slug: 'amostra', summary: 'Resumo revisado.', access_level: 'free',
      modules: { title: 'Módulo', disciplines: { title: 'Disciplina', cycles: { title: 'Ciclo', slug: 'basico' } } },
      lesson_blocks: [{ id: 'b', block_type: 'rich_text', content: { text: 'Texto revisado.' }, position: 0 }],
    };
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((key: string, value: string) => { calls.push(`${key}=${value}`); return builder; }),
      lte: vi.fn((key: string) => { calls.push(`${key}<=now`); return builder; }),
      is: vi.fn((key: string) => { calls.push(`${key}=null`); return builder; }),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    };
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => builder) } as never);

    const sample = await getPublicFreeSample(row.id);
    expect(calls).toContain('access_level=free');
    expect(calls).toContain('status=published');
    expect(calls).toContain('deleted_at=null');
    expect(calls).toContain('published_at<=now');
    expect(sample?.blocks).toEqual([{ id: 'b', type: 'rich_text', text: 'Texto revisado.' }]);
  });
});
