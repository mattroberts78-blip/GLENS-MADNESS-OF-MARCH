'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteBracketButton({ entryId, disabled }: { entryId: number; disabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (disabled || isPending) return;
    setError(null);

    const confirmed = window.confirm(
      'Delete this bracket? This cannot be undone and will remove all picks for this entry.',
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/entries/${entryId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        let message = 'Could not delete bracket.';
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // ignore JSON parse errors
        }
        setError(message);
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="bracket-card__actions">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={handleDelete}
        disabled={disabled || isPending}
      >
        Delete
      </button>
      {error && (
        <p style={{ marginTop: '0.25rem', color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>
      )}
    </div>
  );
}

