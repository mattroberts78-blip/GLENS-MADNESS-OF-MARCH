'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-container" style={{ maxWidth: 520 }}>
      <h1 className="page-title">Something went wrong</h1>
      <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      {error.digest && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Digest: {error.digest}
        </p>
      )}
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
