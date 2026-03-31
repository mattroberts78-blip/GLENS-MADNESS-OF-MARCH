import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { GolfPicksForm } from '@/components/golf/GolfPicksForm';
import { DisplayNameForm } from '@/components/DisplayNameForm';

export const dynamic = 'force-dynamic';

export default async function GolfPicksPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: { editName?: string };
}) {
  const session = await getSession();
  if (!session || session.isAdmin || session.contest !== 'golf') redirect('/login?contest=golf');

  const eventId = Number(params.eventId);
  if (!Number.isFinite(eventId)) redirect('/golf');

  const [eventResult, tiersResult, credResult, existingEntryResult] = await Promise.all([
    sql`SELECT id, name, lock_at FROM golf_events WHERE id = ${eventId} LIMIT 1`,
    sql`
      SELECT t.id AS tier_id, t.tier_number, g.id AS golfer_id, g.name
      FROM golf_tiers t
      JOIN golf_event_tier_golfers etg ON etg.tier_id = t.id
      JOIN golf_golfers g ON g.id = etg.golfer_id
      WHERE t.event_id = ${eventId}
      ORDER BY t.tier_number ASC, g.name ASC
    `,
    sql`SELECT first_name, last_name FROM credentials WHERE id = ${session.credentialId} LIMIT 1`,
    (async () => {
      try {
        return await sql`
          SELECT id, tiebreaker_winner_strokes, submitted_at, locked_at
          FROM golf_entries
          WHERE credential_id = ${session.credentialId} AND event_id = ${eventId}
          LIMIT 1
        `;
      } catch (err) {
        const pg = err as { code?: string };
        // Backward compatible with DBs that do not yet have submitted_at/locked_at.
        if (pg?.code === '42703') {
          return sql`
            SELECT id, tiebreaker_winner_strokes, NULL::timestamptz AS submitted_at, NULL::timestamptz AS locked_at
            FROM golf_entries
            WHERE credential_id = ${session.credentialId} AND event_id = ${eventId}
            LIMIT 1
          `;
        }
        throw err;
      }
    })(),
  ]);

  const event = eventResult.rows[0] as { id: number; name: string; lock_at: string | null } | undefined;
  if (!event) redirect('/golf');

  const cred = credResult.rows[0] as { first_name: string | null; last_name: string | null } | undefined;

  const existing = existingEntryResult.rows[0] as
    | {
        id: number;
        tiebreaker_winner_strokes: number | null;
        submitted_at: string | null;
        locked_at: string | null;
      }
    | undefined;
  let entryId = existing?.id ?? null;
  if (!entryId) {
    const inserted = await sql`
      INSERT INTO golf_entries (credential_id, event_id)
      VALUES (${session.credentialId}, ${eventId})
      RETURNING id
    `;
    entryId = (inserted.rows[0] as { id: number }).id;
  }

  const picksResult = await sql`
    SELECT tier_id, golfer_id
    FROM golf_entry_picks
    WHERE entry_id = ${entryId}
  `;

  const tiers = tiersResult.rows as { tier_id: number; tier_number: number; golfer_id: number; name: string }[];
  const savedPicks = picksResult.rows as { tier_id: number; golfer_id: number }[];

  const firstOk = !!(cred?.first_name ?? '').trim();
  const lastOk = !!(cred?.last_name ?? '').trim();
  const nameComplete = firstOk && lastOk;

  const picksHref = `/golf/events/${eventId}/picks`;
  const editingName = searchParams?.editName === '1';

  return (
    <main className="page-container">
      <h1 className="page-title">{event.name} - Picks</h1>
      <p className="page-subtitle">Enter your leaderboard name, then pick one golfer per tier (A–I) and submit.</p>

      {!nameComplete || editingName ? (
        <>
          {editingName && nameComplete ? (
            <p style={{ marginBottom: '1rem' }}>
              <a href={picksHref} style={{ color: 'var(--accent)' }}>
                ← Back to picks
              </a>
            </p>
          ) : null}
          <DisplayNameForm
            initialFirstName={cred?.first_name ?? null}
            initialLastName={cred?.last_name ?? null}
            redirectAfterSave={picksHref}
            blurb="Enter your first and last name as they should appear on the leaderboard."
          />
        </>
      ) : (
        <>
          <section className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="card-title">Leaderboard name</h2>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              Playing as{' '}
              <strong>
                {(cred!.first_name ?? '').trim()} {(cred!.last_name ?? '').trim()}
              </strong>
              .{' '}
              <a href={`${picksHref}?editName=1`} style={{ color: 'var(--accent)' }}>
                Update name
              </a>
            </p>
          </section>
          <GolfPicksForm
            entryId={entryId}
            eventLockAt={event.lock_at}
            entryLockedAt={existing?.locked_at ?? null}
            submittedAt={existing?.submitted_at ?? null}
            tiers={tiers}
            initialPicks={savedPicks}
            initialTiebreaker={existing?.tiebreaker_winner_strokes ?? null}
          />
        </>
      )}
    </main>
  );
}
