import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { requireRole } from '@/lib/auth/require-role';

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(['admin'], '/admin');
  return <DashboardShell area="Admin">{children}</DashboardShell>;
}
