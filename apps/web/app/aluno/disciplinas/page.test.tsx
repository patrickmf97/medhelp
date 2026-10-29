import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import DisciplinesPage from './page';

vi.mock('@/lib/auth/require-role', () => ({ requireUser: async () => ({ user: { id: 'student' } }) }));
vi.mock('@/lib/study/student-service', () => ({ getStudentDashboard: async () => ({
  premiumAccess: false, progress: [{ lesson_id: 'a', completed_at: '2026-01-01' }],
  lessons: [
    { id: 'a', title: 'Membrana', cycle: 'Básico', discipline: 'Citologia', module: 'Transporte', accessLevel: 'free', position: 1 },
    { id: 'b', title: 'Gradientes', cycle: 'Básico', discipline: 'Citologia', module: 'Transporte', accessLevel: 'premium', position: 2 },
    // Fetched out of curriculum order (as the catalog query returns rows by publish date, not position)
    // to prove the page re-orders by position instead of trusting fetch order.
    { id: 'segunda', title: 'Divisão celular — Metáfase', cycle: 'Básico', discipline: 'Citologia', module: 'Mitose', accessLevel: 'free', position: 2 },
    { id: 'primeira', title: 'Divisão celular — Prófase', cycle: 'Básico', discipline: 'Citologia', module: 'Mitose', accessLevel: 'free', position: 1 },
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

it('orders lessons within a module by their curriculum position, not catalog fetch order', async () => {
  render(await DisciplinesPage());
  const titles = screen.getAllByRole('heading', { level: 5 }).map((heading) => heading.textContent);
  expect(titles.indexOf('Divisão celular — Prófase')).toBeLessThan(titles.indexOf('Divisão celular — Metáfase'));
});
