import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function StudentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <DashboardShell area="Aluno">{children}</DashboardShell>;
}
