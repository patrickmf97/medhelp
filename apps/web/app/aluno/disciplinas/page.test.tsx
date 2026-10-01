import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import DisciplinesPage from './page';

vi.mock('@/lib/auth/require-role', () => ({ requireUser: async () => ({ user: { id: 'student' } }) }));
vi.mock('@/lib/study/student-service', () => ({ getStudentDashboard: async () => ({
  premiumAccess: false, progress: [{ lesson_id: 'a', completed_at: '2026-01-01' }],
  lessons: [
    { id: 'a', title: 'Membrana', cycle: 'Básico', discipline: 'Citologia', module: 'Transporte', accessLevel: 'free' },
    { id: 'b', title: 'Gradientes', cycle: 'Básico', discipline: 'Citologia', module: 'Transporte', accessLevel: 'premium' },
  ],
}) }));

it('presents discipline/module hierarchy with existing access and completion badges', async () => {
  render(await DisciplinesPage());
  expect(screen.getByRole('heading', { name: 'Básico', level: 2 })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Citologia', level: 3 })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Transporte', level: 4 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Membrana/ })).toHaveTextContent('Concluída');
  expect(screen.getByRole('link', { name: /Gradientes/ })).toHaveTextContent('Ver prévia');
});
