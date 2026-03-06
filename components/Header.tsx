import Link from 'next/link';
import { getSession } from '@/lib/auth/session';

export function Header() {
  const session = getSession();

  return (
    <header className="site-header">
      <Link href="/" className="site-brand">
        <span className="site-logo-wrap">
          <img src="/glensmadness.png" alt="Glen" width={56} height={56} className="site-logo" />
        </span>
        <span className="site-title">Glen&apos;s Madness of March</span>
      </Link>
      <nav className="site-nav">
        {session?.isAdmin ? (
          <Link href="/admin" className="nav-link">Admin</Link>
        ) : session ? (
          <>
            <Link href="/" className="nav-link">My brackets</Link>
            <Link href="/scoreboard" className="nav-link">Scoreboard</Link>
          </>
        ) : (
          <>
            <Link href="/login" className="nav-link nav-link-cta">Log in</Link>
            <Link href="/admin" className="nav-link nav-link-muted">Admin</Link>
          </>
        )}
      </nav>
    </header>
  );
}
