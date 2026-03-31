'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-container" style={{ maxWidth: 520 }}>
      <h1 className="page-title">Admin Error</h1>
      <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>
        {error.message || 'An unexpected error occurred on the admin page.'}
      </p>
      {error.digest && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Digest: {error.digest}
        </p>
      )}
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
      <a href="/" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>
        Back to contest selection
      </a>
    </main>
  );
}
