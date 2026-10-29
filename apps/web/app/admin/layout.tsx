import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { requireRole } from '@/lib/auth/require-role';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(['admin'], '/admin');
  return <DashboardShell area="Admin">{children}</DashboardShell>;
}
