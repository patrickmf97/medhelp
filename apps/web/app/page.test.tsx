import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the clinical premium landing page at the root route', () => {
    render(<HomePage />);

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: 'Medicina é difícil. Estudar não precisa ser.',
      }),
    ).toBeVisible();
    expect(
      screen.getAllByRole('link', { name: 'Começar agora' })[0],
    ).toHaveAttribute('href', '/cadastro');
    expect(
      screen.getByRole('heading', {
        name: 'Um sistema de estudo. Não mais uma pilha de abas.',
      }),
    ).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Ciclo clínico' })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Uma assinatura. Toda a jornada.' }),
    ).toBeVisible();
    expect(screen.getByRole('contentinfo')).toBeVisible();
  });
});
