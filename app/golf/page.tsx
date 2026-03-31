import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

type GolfEvent = {
  id: number;
  name: string;
  starts_at: string | null;
  lock_at: string | null;
  is_active: boolean;
};

export default async function GolfHomePage() {
  const session = await getSession();
  const golfUser = !!(session && !session.isAdmin && session.contest === 'golf');

  let events: GolfEvent[] = [];
  let entriesByEvent = new Map<number, number>();

  try {
    const eventsResult = await sql`
      SELECT id, name, starts_at, lock_at, is_active
      FROM golf_events
      ORDER BY starts_at DESC NULLS LAST, id DESC
      LIMIT 25
    `;
    events = eventsResult.rows as GolfEvent[];

    if (golfUser && session) {
      const entriesResult = await sql`
        SELECT event_id, id
        FROM golf_entries
        WHERE credential_id = ${session.credentialId}
      `;
      for (const row of entriesResult.rows as { event_id: number; id: number }[]) {
        entriesByEvent.set(row.event_id, row.id);
      }
    }
  } catch {
    events = [];
  }

  if (!golfUser) {
    return (
      <main className="page-container">
        <h1 className="page-title">Golf Pick&apos;em</h1>
        <p className="page-subtitle">
          <Link href="/login?contest=golf" className="nav-link nav-link-cta" style={{ display: 'inline-block' }}>
            Log in with a golf account
          </Link>{' '}
          to make picks. Leaderboards are public — anyone can view scores below.
        </p>
        {events.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No golf events yet.</p>
        ) : (
          <ul className="bracket-list">
            {events.map((event) => (
              <li key={event.id}>
                <div className="bracket-card">
                  <div className="bracket-card__main">
                    <strong>{event.name}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                      {event.starts_at ? `Starts: ${new Date(event.starts_at).toLocaleString()}` : 'Start date TBD'}
                    </div>
                  </div>
                  <Link href={`/golf/events/${event.id}/leaderboard`} className="nav-link">
                    Leaderboard
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  return (
    <main className="page-container">
      <h1 className="page-title">Golf Pick'em</h1>
      <p className="page-subtitle">Select an event, submit one golfer per tier, and track round scoring.</p>
      {events.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No golf events yet. Ask an admin to create one.</p>
      ) : (
        <ul className="bracket-list">
          {events.map((event) => {
            const entryId = entriesByEvent.get(event.id);
            return (
              <li key={event.id}>
                <div className="bracket-card">
                  <div className="bracket-card__main">
                    <strong>{event.name}</strong>
                    {event.is_active ? (
                      <span className="badge badge-complete">Active</span>
                    ) : (
                      <span className="badge badge-locked">Inactive</span>
                    )}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                      {event.starts_at ? `Starts: ${new Date(event.starts_at).toLocaleString()}` : 'Start date TBD'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link href={`/golf/events/${event.id}/picks`} className="nav-link nav-link-cta">
                      {entryId ? 'Edit picks' : 'Make picks'}
                    </Link>
                    <Link href={`/golf/events/${event.id}/leaderboard`} className="nav-link">
                      Leaderboard
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
