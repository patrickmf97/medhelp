import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from './hero';

describe('Hero', () => {
  it('presents the approved promise, price and calls to action', () => {
    render(<Hero />);

    expect(screen.getByRole('heading', { name: 'Medicina é difícil. Estudar não precisa ser.' })).toBeVisible();
    expect(screen.getByText('R$ 30/mês')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Começar agora' })).toHaveAttribute('href', '/cadastro');
    expect(screen.getByRole('link', { name: 'Explorar gratuitamente' })).toHaveAttribute('href', '/explorar');
  });
});
