import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import EditorNotFound from './not-found';

describe('editor not-found boundary', () => {
  it('renders a not-found message pointing back to the content list', () => {
    render(<EditorNotFound />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /conteúdos/i })).toHaveAttribute('href', '/editor/conteudos');
  });
});
