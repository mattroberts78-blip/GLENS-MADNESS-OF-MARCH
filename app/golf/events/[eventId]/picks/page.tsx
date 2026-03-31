import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { GolfPicksForm } from '@/components/golf/GolfPicksForm';

export const dynamic = 'force-dynamic';

export default async function GolfPicksPage({ params }: { params: { eventId: string } }) {
  const session = await getSession();
  if (!session || session.isAdmin || session.contest !== 'golf') redirect('/login?contest=golf');

  const eventId = Number(params.eventId);
  if (!Number.isFinite(eventId)) redirect('/golf');

  const [eventResult, tiersResult, existingEntryResult] = await Promise.all([
    sql`SELECT id, name, lock_at FROM golf_events WHERE id = ${eventId} LIMIT 1`,
    sql`
      SELECT t.id AS tier_id, t.tier_number, g.id AS golfer_id, g.name
      FROM golf_tiers t
      JOIN golf_event_tier_golfers etg ON etg.tier_id = t.id
      JOIN golf_golfers g ON g.id = etg.golfer_id
      WHERE t.event_id = ${eventId}
      ORDER BY t.tier_number ASC, g.name ASC
    `,
    sql`
      SELECT id, tiebreaker_winner_strokes
      FROM golf_entries
      WHERE credential_id = ${session.credentialId} AND event_id = ${eventId}
      LIMIT 1
    `,
  ]);

  const event = eventResult.rows[0] as { id: number; name: string; lock_at: string | null } | undefined;
  if (!event) redirect('/golf');

  const existing = existingEntryResult.rows[0] as { id: number; tiebreaker_winner_strokes: number | null } | undefined;
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

  return (
    <main className="page-container">
      <h1 className="page-title">{event.name} - Picks</h1>
      <p className="page-subtitle">Pick one golfer from each of 9 tiers. Tiebreaker is winner total strokes.</p>
      <GolfPicksForm
        entryId={entryId}
        eventId={eventId}
        lockAt={event.lock_at}
        tiers={tiers}
        initialPicks={savedPicks}
        initialTiebreaker={existing?.tiebreaker_winner_strokes ?? null}
      />
    </main>
  );
}
