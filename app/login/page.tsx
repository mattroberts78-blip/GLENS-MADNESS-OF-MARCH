export default function LoginPage() {
  return (
    <main style={{ padding: '2rem', maxWidth: 400, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        Participant login
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Use the username and password you received after signing up.
      </p>
      <form
        action="#"
        method="post"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          Username
          <input
            type="text"
            name="username"
            autoComplete="username"
            style={{
              padding: '0.5rem',
              borderRadius: 6,
              border: '1px solid var(--surface)',
              background: 'var(--surface)',
              color: 'var(--text)',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            style={{
              padding: '0.5rem',
              borderRadius: 6,
              border: '1px solid var(--surface)',
              background: 'var(--surface)',
              color: 'var(--text)',
            }}
          />
        </label>
        <button
          type="submit"
          style={{
            padding: '0.6rem 1rem',
            background: 'var(--accent)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Log in
        </button>
      </form>
    </main>
  );
}
