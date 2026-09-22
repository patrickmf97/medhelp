import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Header } from './header';

describe('Header', () => {
  it('links sections through the home route from every public page', () => {
    render(<Header />);
    const resources = screen.getAllByRole('link', { name: 'Recursos' });
    expect(resources.every((link) => link.getAttribute('href') === '/#recursos')).toBe(true);
  });
});
