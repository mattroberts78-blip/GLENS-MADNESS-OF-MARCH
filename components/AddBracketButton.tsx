'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function AddBracketButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);

    const confirmed = window.confirm(
      'Add a new bracket to your account? This will create another entry for this contest.',
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        let message = 'Could not create bracket.';
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // ignore JSON parse errors and fall back to default message
        }
        setError(message);
        return;
      }

      startTransition(() => {
        // Refresh the page so the new bracket appears in the list immediately.
        router.refresh();
      });
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? 'Creating…' : 'Add bracket'}
      </button>
      {error && (
        <p style={{ marginTop: '0.5rem', color: 'var(--danger)' }}>{error}</p>
      )}
    </div>
  );
}

