import Link from 'next/link';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; msg?: string; reason?: string; contest?: string };
}) {
  const showError = searchParams?.error === '1';
  const sessionExpired = searchParams?.reason === 'session_expired';
  const selectedContest = searchParams?.contest === 'golf' ? 'golf' : 'basketball';

  return (
    <main className="page-container" style={{ maxWidth: 420 }}>
      <h1 className="page-title">Log in</h1>
      <p className="page-subtitle">
        {selectedContest === 'golf' ? "Dan's Master's Pick'em" : "Glen's Madness of March"} login.
        Participants use email + PIN. Admins use their contest-specific admin credentials.
      </p>
      {sessionExpired && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Your session expired. Please log in again.
        </p>
      )}
      {showError && !sessionExpired && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Invalid credentials.{searchParams?.msg ? ` (${searchParams.msg})` : ''}
        </p>
      )}
      <form action="/api/auth/login" method="POST" className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="hidden" name="contest" value={selectedContest} />
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Email or admin username
          <input type="text" name="username" autoComplete="username" placeholder="you@example.com or admin" className="input" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          PIN or password
          <input type="password" name="password" autoComplete="current-password" placeholder="••••" className="input" style={{ width: 120 }} />
        </label>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
          Log in
        </button>
      </form>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href={`/create-account?contest=${selectedContest}`} className="btn btn-secondary">
          Create account
        </Link>
        <Link href="/" className="nav-link">
          Back to contest selection
        </Link>
      </div>
    </main>
  );
}
