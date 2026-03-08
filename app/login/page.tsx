export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; msg?: string };
}) {
  const showError = searchParams?.error === '1';

  return (
    <main className="page-container" style={{ maxWidth: 420 }}>
      <h1 className="page-title">Log in</h1>
      <p className="page-subtitle">
        Participants: use your email and 4-digit PIN. Admins: use username <strong>admin</strong> and your admin password.
      </p>
      {showError && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Invalid credentials.{searchParams?.msg ? ` (${searchParams.msg})` : ''}
        </p>
      )}
      <form action="/api/auth/login" method="POST" className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
