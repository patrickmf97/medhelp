import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AtlasExplorer } from './atlas-explorer';

describe('AtlasExplorer', () => {
  it('updates the visible structures when a system is selected', () => {
    render(<AtlasExplorer />);

    expect(
      screen.getByRole('heading', { name: 'Sistema cardiovascular' }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Explorar sistema nervoso' }));

    expect(
      screen.getByRole('button', { name: 'Explorar sistema nervoso' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Sistema nervoso' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Encéfalo' })).toBeVisible();
  });
});
