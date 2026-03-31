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
        Choose contest first. Participants use email + PIN. Each contest has separate user/admin accounts.
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
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Contest
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <input type="radio" name="contest" value="basketball" defaultChecked={selectedContest === 'basketball'} />
              Basketball
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <input type="radio" name="contest" value="golf" defaultChecked={selectedContest === 'golf'} />
              Golf
            </label>
          </div>
        </label>
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
    </main>
  );
}
