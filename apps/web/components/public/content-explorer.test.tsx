import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ContentExplorer } from './content-explorer';

const items = [
  {
    id: '1',
    title: 'Introdução à anatomia cardíaca',
    slug: 'anatomia-cardiaca',
    summary: 'Prévia introdutória.',
    accessLevel: 'free' as const,
    module: 'Tórax',
    discipline: 'Anatomia',
    cycle: 'Ciclo Básico',
    cycleSlug: 'basico',
  },
  {
    id: '2',
    title: 'Raciocínio clínico organizado',
    slug: 'raciocinio-clinico',
    summary: 'Estruture sua revisão.',
    accessLevel: 'premium' as const,
    module: 'Integração',
    discipline: 'Clínica médica',
    cycle: 'Ciclo Clínico',
    cycleSlug: 'clinico',
  },
];

afterEach(cleanup);

describe('ContentExplorer', () => {
  it('filters content by search, cycle and access level', () => {
    render(<ContentExplorer items={items} status="ready" />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar conteúdos' }), {
      target: { value: 'cardíaca' },
    });
    expect(screen.getByRole('heading', { name: 'Introdução à anatomia cardíaca' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Raciocínio clínico organizado' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Buscar conteúdos'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Ciclo'), { target: { value: 'clinico' } });
    fireEvent.change(screen.getByLabelText('Acesso'), { target: { value: 'premium' } });

    expect(screen.getByRole('heading', { name: 'Raciocínio clínico organizado' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Introdução à anatomia cardíaca' })).toBeNull();
  });

  it('shows a useful empty result after filtering', () => {
    render(<ContentExplorer items={items} status="ready" />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar conteúdos' }), {
      target: { value: 'neurologia' },
    });

    expect(screen.getByText('Nenhum conteúdo encontrado')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeVisible();
  });

  it('distinguishes an unavailable catalog from an empty published catalog', () => {
    const { rerender } = render(<ContentExplorer items={[]} status="empty" />);
    expect(screen.getByText('Conteúdos em preparação')).toBeVisible();

    rerender(<ContentExplorer items={[]} status="unavailable" />);
    expect(screen.getByText('Catálogo temporariamente indisponível')).toBeVisible();
  });

  it('opens a released free lesson sample without demanding registration', () => {
    render(<ContentExplorer items={items} status="ready" />);
    expect(screen.getByRole('link', { name: /Ler amostra gratuita/ })).toHaveAttribute(
      'href', '/explorar/aula/1',
    );
  });
});
