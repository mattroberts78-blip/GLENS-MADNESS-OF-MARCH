import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { computeEntryScore, computeEntryMaxScore } from '@/lib/scoring';
import type { ResultsJson } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export default async function ScoreboardPage() {
  const session = await getSession();
  if (!session || session.isAdmin) {
    return (
      <main className="page-container">
        <p style={{ marginBottom: '1rem' }}>
          <Link href="/" className="nav-link">← Back</Link>
        </p>
        <h1 className="page-title">Scoreboard</h1>
        <p className="page-subtitle">Log in as a participant to view the scoreboard.</p>
      </main>
    );
  }

  let contest: { id: number; name: string; results_json: unknown } | null = null;
  let rows: {
    entry_id: number;
    entry_name: string | null;
    credential_id: number;
    username: string;
    first_name: string | null;
    last_name: string | null;
    payment_verified_at: string | null;
    picks_json: unknown;
  }[] = [];

  try {
    const contestResult = await sql`
      SELECT id, name, results_json
      FROM contests
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const contestRow = contestResult.rows[0];
    contest = contestRow != null ? (contestRow as unknown as { id: number; name: string; results_json: unknown }) : null;

    if (contest) {
      const entriesResult = await sql`
        SELECT e.id AS entry_id, e.name AS entry_name, e.picks_json,
               c.id AS credential_id, c.username, c.first_name, c.last_name, c.payment_verified_at
        FROM entries e
        JOIN credentials c ON c.id = e.credential_id
        WHERE LOWER(TRIM(c.username)) <> 'admin'
          AND c.payment_verified_at IS NOT NULL
        ORDER BY c.id ASC, e.id ASC
      `;
      rows = entriesResult.rows as typeof rows;
    }
  } catch (err) {
    console.error('[scoreboard]', err);
  }

  const results = (contest?.results_json as ResultsJson | null) ?? null;
  const withScores = rows.map((r) => {
    const picks = r.picks_json as Record<string, 0 | 1> | null;
    const score = computeEntryScore(picks, results);
    const maxScore = computeEntryMaxScore(picks, results);
    const remaining = Math.max(0, maxScore - score);
    return {
      ...r,
      score,
      maxScore,
      remaining,
    };
  });

  // Build display name: "First Last 1", "First Last 2", etc. per credential
  let prevCredentialId: number | null = null;
  let entryIndex = 0;
  const withDisplayName = withScores.map((r) => {
    if (r.credential_id !== prevCredentialId) {
      prevCredentialId = r.credential_id;
      entryIndex = 1;
    } else {
      entryIndex += 1;
    }
    const first = (r.first_name ?? '').trim();
    const last = (r.last_name ?? '').trim();
    const baseName = first || last ? `${first} ${last}`.trim() : r.username;
    const displayName = `${baseName} ${entryIndex}`;
    return { ...r, displayName };
  });

  withDisplayName.sort((a, b) => b.score - a.score);

  return (
    <main className="page-container">
      <p style={{ marginBottom: '1rem' }}>
        <Link href="/" className="nav-link">← Back to your brackets</Link>
      </p>
      <h1 className="page-title">Scoreboard</h1>
      <p className="page-subtitle">
        {contest
          ? `Live standings for ${contest.name}. Points = correct pick (winner seed + round bonus). Only payment-verified participants count toward the overall winner.`
          : 'No contest yet. Once the admin adds results, standings will appear here.'}
      </p>

      {withDisplayName.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No entries yet.</p>
      ) : (
        <section className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>#</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Bracket</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Participant</th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Points</th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Max</th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {withDisplayName.map((r, i) => (
                <tr key={r.entry_id}>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{i + 1}</td>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{r.entry_name ?? `Bracket ${r.entry_id}`}</td>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{r.displayName}</td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '0.5rem 0.75rem',
                      borderTop: '1px solid var(--border)',
                      fontWeight: 600,
                    }}
                  >
                    {r.score}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '0.5rem 0.75rem',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    {r.maxScore}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '0.5rem 0.75rem',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    {r.remaining}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
