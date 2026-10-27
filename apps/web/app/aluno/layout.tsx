import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function StudentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <DashboardShell area="Aluno">{children}</DashboardShell>;
}
