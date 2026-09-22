import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { requireUser } from '@/lib/auth/require-role';

export default async function StudentLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireUser('/aluno');
  return <DashboardShell area="Aluno">{children}</DashboardShell>;
}
