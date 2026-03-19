'use client';

import Link from 'next/link';
import { useTransition, useState } from 'react';

type EntryRow = {
  id: number;
  name: string | null;
  locked_at: string | null;
  username: string;
};

export function BracketsAdmin({ entries, adminToken }: { entries: EntryRow[]; adminToken: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (entryId: number) => {
    if (isPending) return;
    setError(null);

    const confirmed = window.confirm(
      'Delete this bracket? This cannot be undone and will remove all picks for this entry.',
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/entries/${entryId}?_token=${encodeURIComponent(adminToken)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Failed to delete bracket.');
        return;
      }

      startTransition(() => {
        window.location.reload();
      });
    } catch {
      setError('Failed to delete bracket. Please try again.');
    }
  };

  return (
    <div>
      {error && (
        <p style={{ color: 'var(--danger)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
          {error}
        </p>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
              Bracket ID
            </th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
              Name
            </th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
              Participant
            </th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
              Status
            </th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>
                No brackets found.
              </td>
            </tr>
          ) : (
            entries.map((e) => {
              const locked = e.locked_at != null;
              return (
                <tr key={e.id}>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{e.id}</td>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                    {e.name || '(unnamed)'}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{e.username}</td>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                    {locked ? (
                      <span className="badge badge-locked">Locked</span>
                    ) : (
                      <span className="badge badge-open">Open</span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/admin/brackets/${e.id}`} className="btn btn-secondary">
                        View
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleDelete(e.id)}
                        disabled={isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

