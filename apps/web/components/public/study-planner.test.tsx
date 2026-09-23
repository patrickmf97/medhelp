import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StudyPlanner } from './study-planner';

afterEach(cleanup);

describe('StudyPlanner', () => {
  it('switches the suggested routine by formation stage', () => {
    render(<StudyPlanner />);

    expect(screen.getByRole('tab', { name: 'Ciclo básico' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('heading', { name: 'Base sólida, progresso visível' }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: 'Internato' }));

    expect(screen.getByRole('tab', { name: 'Internato' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('heading', { name: 'Decida com método sob pressão' }),
    ).toBeVisible();
    expect(screen.getByText('Plantão simulado')).toBeVisible();
  });

  it('moves tab focus and selection with arrow, Home and End keys', () => {
    render(<StudyPlanner />);
    const basic = screen.getByRole('tab', { name: 'Ciclo básico' });
    const clinical = screen.getByRole('tab', { name: 'Ciclo clínico' });
    const internship = screen.getByRole('tab', { name: 'Internato' });
    basic.focus();

    fireEvent.keyDown(basic, { key: 'ArrowRight' });
    expect(clinical).toHaveFocus();
    expect(clinical).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(clinical, { key: 'End' });
    expect(internship).toHaveFocus();
    fireEvent.keyDown(internship, { key: 'Home' });
    expect(basic).toHaveFocus();
    expect(basic).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(basic, { key: 'ArrowLeft' });
    expect(internship).toHaveFocus();
  });
});
