import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { requireRole } from '@/lib/auth/require-role';

export default async function EditorLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(['editor', 'admin'], '/editor');
  return <DashboardShell area="Editorial">{children}</DashboardShell>;
}
