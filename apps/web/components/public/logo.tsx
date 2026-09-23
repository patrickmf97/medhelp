import Link from 'next/link';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="MEDHELP — início" className="logo" href="/">
      <svg aria-hidden="true" className="logo__mark" viewBox="0 0 48 48">
        <path d="M24 8C18 4.5 11.5 4.2 5.5 6.7v26.7c6.3-2.5 12.7-1.5 18.5 2.8V8Z" fill="currentColor" opacity=".96" />
        <path d="M24 8c6-3.5 12.5-3.8 18.5-1.3v26.7c-6.3-2.5-12.7-1.5-18.5 2.8V8Z" fill="currentColor" opacity=".62" />
        <path d="M20.5 11.5h7v8h8v7h-8v8h-7v-8h-8v-7h8v-8Z" fill="var(--logo-cross,#fff)" />
        <path d="M7.5 38.5c5.7-1.7 11.2-.6 16.5 3.4 5.3-4 10.8-5.1 16.5-3.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
      {!compact ? <span>MEDHELP</span> : null}
    </Link>
  );
}
