import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Header } from './header';

afterEach(cleanup);

describe('Header', () => {
  it('links sections through the home route from every public page', () => {
    render(<Header />);
    const resources = screen.getAllByRole('link', { name: 'Recursos' });
    expect(resources.every((link) => link.getAttribute('href') === '/#recursos')).toBe(true);
  });

  it('exposes and dismisses an accessible mobile navigation', () => {
    render(<Header />);

    const openButton = screen.getByRole('button', { name: 'Abrir menu' });
    expect(openButton).toHaveAttribute('aria-controls', 'mobile-navigation');

    fireEvent.click(openButton);
    const mobileNavigation = screen.getByRole('navigation', { name: 'Navegação móvel' });
    expect(mobileNavigation).toBeVisible();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mobileNavigation).not.toBeVisible();
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();
  });
});
