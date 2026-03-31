import Link from 'next/link';

export default function CreateAccountPage({
  searchParams,
}: {
  searchParams?: { error?: string; contest?: string };
}) {
  const error = searchParams?.error;
  const selectedContest = searchParams?.contest === 'golf' ? 'golf' : 'basketball';

  return (
    <main className="page-container" style={{ maxWidth: 420 }}>
      <h1 className="page-title">Create account</h1>
      <p className="page-subtitle">
        Choose contest, then create your login with email and 4-digit PIN.
      </p>

      {error === 'email' && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Please enter a valid email address.
        </p>
      )}
      {error === 'pin' && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          PIN must be exactly 4 digits.
        </p>
      )}
      {error === 'confirm' && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          PIN and confirmation do not match.
        </p>
      )}
      {error === 'duplicate' && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          An account with that email already exists. <Link href="/login">Log in</Link> instead.
        </p>
      )}

      <form action="/api/auth/create-account" method="POST" className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className="input"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          4-digit PIN
          <input
            type="password"
            name="pin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            placeholder="••••"
            required
            className="input"
            style={{ width: 120 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Confirm 4-digit PIN
          <input
            type="password"
            name="confirmPin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            placeholder="••••"
            required
            className="input"
            style={{ width: 120 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Number of brackets (basketball only)
          <input
            type="number"
            name="brackets"
            min={1}
            max={20}
            defaultValue={1}
            required
            className="input"
            style={{ width: 88 }}
          />
        </label>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
          Create account
        </button>
      </form>

      <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
