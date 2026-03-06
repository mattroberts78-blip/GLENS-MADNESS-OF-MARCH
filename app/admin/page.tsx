export default function AdminPage() {
  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Admin</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Next available credential, result entry, and bracket lock will go here.
      </p>
      <section
        style={{
          padding: '1rem',
          background: 'var(--surface)',
          borderRadius: 8,
        }}
      >
        <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
          Next available login
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          (Connect Vercel Postgres and run schema to show credentials here.)
        </p>
      </section>
    </main>
  );
}
