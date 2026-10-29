import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import NotFound from './not-found';

describe('root not-found boundary', () => {
  it('renders a not-found message with a link home', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /início/i })).toHaveAttribute('href', '/');
  });
});
