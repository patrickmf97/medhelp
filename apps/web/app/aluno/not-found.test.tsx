import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AlunoNotFound from './not-found';

describe('aluno not-found boundary', () => {
  it('renders a not-found message pointing back to the disciplines catalog', () => {
    render(<AlunoNotFound />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /disciplinas/i })).toHaveAttribute('href', '/aluno/disciplinas');
  });
});
