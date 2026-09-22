import Link from 'next/link';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="MEDHELP — início" className="logo" href="/">
      <svg aria-hidden="true" className="logo__mark" viewBox="0 0 48 48">
        <path d="M24 10c-5-4-11-5-17-3v25c6-2 12-1 17 3V10Z" fill="currentColor" opacity=".9" />
        <path d="M24 10c5-4 11-5 17-3v25c-6-2-12-1-17 3V10Z" fill="currentColor" opacity=".65" />
        <path d="M20 13h8v7h7v8h-7v7h-8v-7h-7v-8h7v-7Z" fill="var(--surface)" />
      </svg>
      {!compact ? <span>MEDHELP</span> : null}
    </Link>
  );
}
