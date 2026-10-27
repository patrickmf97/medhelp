import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RouteNotFoundView } from './route-not-found-view';

describe('RouteNotFoundView', () => {
  it('renders an accessible not-found message with a link home', () => {
    render(<RouteNotFoundView homeHref="/aluno/disciplinas" homeLabel="Ver disciplinas" />);

    expect(screen.getByRole('heading')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Ver disciplinas' });
    expect(link).toHaveAttribute('href', '/aluno/disciplinas');
  });

  it('falls back to a sensible default home link', () => {
    render(<RouteNotFoundView />);
    expect(screen.getByRole('link', { name: /início/i })).toHaveAttribute('href', '/');
  });
});
