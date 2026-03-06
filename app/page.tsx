import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
        Glens Madness
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        NCAA March Madness bracket contest
      </p>
      <nav style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link
          href="/login"
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--surface)',
            borderRadius: 6,
            textDecoration: 'none',
            color: 'var(--text)',
          }}
        >
          Participant login
        </Link>
        <Link
          href="/admin"
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--surface)',
            borderRadius: 6,
            textDecoration: 'none',
            color: 'var(--muted)',
          }}
        >
          Admin
        </Link>
      </nav>
    </main>
  );
}
