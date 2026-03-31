import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { signAdminToken, verifyAdminToken } from '@/lib/auth/admin-token';
import { AdminDashboardShell } from '@/components/AdminDashboardShell';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { t?: string };
}) {
  const session = await getSession();
  const urlToken = searchParams?.t ?? '';
  const hasValidSession = session?.isAdmin === true;
  const hasValidToken = urlToken.length > 0 && verifyAdminToken(urlToken);

  if (!hasValidSession && !hasValidToken) {
    redirect('/login?reason=session_expired');
  }

  const username = session?.username ?? 'admin';
  const contest = session?.contest === 'golf' ? 'golf' : 'basketball';
  const adminToken = hasValidToken && urlToken.length > 0 ? urlToken : signAdminToken();

  let participants: {
    id: number;
    username: string;
    payment_verified_at: string | null;
    entry_count: string;
  }[] = [];
  let entries: {
    id: number;
    name: string | null;
    locked_at: string | null;
    username: string;
    picks_complete: boolean | null;
  }[] = [];
  let dbError: string | null = null;
  let teams: {
    region: string;
    seed: number;
    name: string | null;
  }[] = [];
  let golfEvents: { id: number; name: string }[] = [];

  try {
    if (contest === 'basketball') {
      const participantsResult = await sql`
        SELECT c.id, c.username, c.payment_verified_at,
               (SELECT COUNT(*) FROM entries e WHERE e.credential_id = c.id) AS entry_count
        FROM credentials c
        WHERE LOWER(TRIM(c.username)) <> 'admin'
          AND c.contest_type = 'basketball'
        ORDER BY c.created_at DESC
        LIMIT 100
      `;
      participants = participantsResult.rows as typeof participants;

      const entriesResult = await sql`
        SELECT e.id, e.name, e.locked_at, e.picks_complete, c.username
        FROM entries e
        JOIN credentials c ON e.credential_id = c.id
        WHERE LOWER(TRIM(c.username)) <> 'admin'
          AND c.contest_type = 'basketball'
        ORDER BY e.created_at DESC
        LIMIT 200
      `;
      entries = entriesResult.rows as typeof entries;

      const contestResult = await sql`
        SELECT id
        FROM contests
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const contestRow = contestResult.rows[0] as { id: number } | undefined;
      if (contestRow) {
        const teamsResult = await sql`
          SELECT region, seed, name
          FROM teams
          WHERE contest_id = ${contestRow.id}
          ORDER BY region, seed
        `;
        teams = teamsResult.rows as typeof teams;
      }
    } else {
      const golfEventsResult = await sql`
        SELECT id, name
        FROM golf_events
        ORDER BY starts_at DESC NULLS LAST, id DESC
      `;
      golfEvents = golfEventsResult.rows as typeof golfEvents;
    }
  } catch (err: unknown) {
    console.error('[admin page]', err);
    dbError = err instanceof Error ? err.message : 'Unknown database error';
  }

  return (
    <AdminDashboardShell
      username={username}
      adminToken={adminToken}
      participants={participants}
      entries={entries}
      teams={teams}
      golfEvents={golfEvents}
      contest={contest}
      dbError={dbError}
    />
  );
}
