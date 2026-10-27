import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PublicNotFound from './not-found';

describe('public not-found boundary', () => {
  it('renders a not-found message with a link home', () => {
    render(<PublicNotFound />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /início/i })).toHaveAttribute('href', '/');
  });
});
