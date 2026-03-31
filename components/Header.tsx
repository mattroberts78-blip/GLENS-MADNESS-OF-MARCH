import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { sql } from '@vercel/postgres';
import { Countdown } from '@/components/Countdown';

export async function Header() {
  const session = await getSession();
  const homeHref = session?.isAdmin ? '/admin' : '/';

  let displayName: string = session?.username ?? '';
  let bracketsLocked = false;
  if (session && !session.isAdmin) {
    try {
      const row = await sql`
        SELECT c.first_name, c.last_name,
               (SELECT COUNT(*)::int FROM entries e WHERE e.credential_id = c.id AND e.locked_at IS NOT NULL) AS locked_count
        FROM credentials c
        WHERE c.id = ${session.credentialId}
      `.then((r) => r.rows[0] as { first_name: string | null; last_name: string | null; locked_count: number } | undefined);
      const first = (row?.first_name ?? '').trim();
      const last = (row?.last_name ?? '').trim();
      displayName = first || last ? `${first} ${last}`.trim() : session.username;
      bracketsLocked = (Number(row?.locked_count) || 0) > 0;
    } catch {
      // keep defaults
    }
  }

  return (
    <header className="site-header">
      <Link href={homeHref} className="site-brand">
        <span className="site-logo-wrap">
          <img src="/glensmadness.png" alt="Glen" width={56} height={56} className="site-logo" />
        </span>
        <span className="site-title">Glen&apos;s Madness of March</span>
      </Link>
      <Countdown />
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
            <span className="nav-link" style={{ cursor: 'default', color: 'var(--text)' }}>
              {displayName}
            </span>
            {!bracketsLocked && (
              <Link href="/?edit=name" className="nav-link" style={{ fontSize: '0.8rem' }}>
                Change
              </Link>
            )}
            <Link href="/" className="nav-link">Basketball</Link>
            <Link href="/golf" className="nav-link">Golf pick'em</Link>
            <Link href="/" className="nav-link">My brackets</Link>
            <Link href="/scoreboard" className="nav-link">Scoreboard</Link>
          </>
        ) : (
          <>
            <Link href="/login" className="nav-link nav-link-cta">Log in</Link>
            <Link href="/create-account" className="nav-link">Create account</Link>
          </>
        )}
      </nav>
    </header>
  );
}
