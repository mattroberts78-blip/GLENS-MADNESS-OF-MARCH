import Link from 'next/link';
import { getSession } from '@/lib/auth/session';

export async function Header() {
  const session = await getSession();

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
          <>
            <form action="/logout" method="POST" style={{ display: 'inline' }}>
              <button type="submit" className="nav-link" style={{ background: 'none', border: 'none', padding: 0 }}>
                Log out
              </button>
            </form>
            <Link href="/admin" className="nav-link">Admin</Link>
          </>
        ) : session ? (
          <>
            <form action="/logout" method="POST" style={{ display: 'inline' }}>
              <button type="submit" className="nav-link" style={{ background: 'none', border: 'none', padding: 0 }}>
                Log out
              </button>
            </form>
            <Link href="/" className="nav-link">My brackets</Link>
            <Link href="/scoreboard" className="nav-link">Scoreboard</Link>
          </>
        ) : (
          <>
            <Link href="/login" className="nav-link nav-link-cta">Log in</Link>
            <Link href="/create-account" className="nav-link">Create account</Link>
            <Link href="/admin" className="nav-link nav-link-muted">Admin</Link>
          </>
        )}
      </nav>
    </header>
  );
}
