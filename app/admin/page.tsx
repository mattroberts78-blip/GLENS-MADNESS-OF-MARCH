import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { signAdminToken, verifyAdminToken } from '@/lib/auth/admin-token';
import { PaymentTable } from '@/components/PaymentTable';
import { TeamsAdmin } from '@/components/TeamsAdmin';
import { ContestResultsAdmin } from '@/components/ContestResultsAdmin';
import { LockBracketsAdmin } from '@/components/LockBracketsAdmin';

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
  const adminToken = hasValidToken && urlToken.length > 0 ? urlToken : signAdminToken();

  let participants: {
    id: number;
    username: string;
    payment_verified_at: string | null;
    entry_count: string;
  }[] = [];
  let dbError: string | null = null;
  let teams: {
    region: string;
    seed: number;
    name: string | null;
  }[] = [];

  try {
    const participantsResult = await sql`
      SELECT c.id, c.username, c.payment_verified_at,
             (SELECT COUNT(*) FROM entries e WHERE e.credential_id = c.id) AS entry_count
      FROM credentials c
      WHERE LOWER(TRIM(c.username)) <> 'admin'
      ORDER BY c.created_at DESC
      LIMIT 100
    `;
    participants = participantsResult.rows as typeof participants;

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
  } catch (err: unknown) {
    console.error('[admin page]', err);
    dbError = err instanceof Error ? err.message : 'Unknown database error';
  }

  return (
    <main className="page-container" style={{ maxWidth: 820 }}>
      <h1 className="page-title">Admin</h1>
      <p className="page-subtitle">
        Glen&apos;s Madness of March — Logged in as <strong>{username}</strong>. Verify payment so a participant counts toward the overall winner.
      </p>

      <section className="card">
        <h2 className="card-title">Participants</h2>
        {dbError ? (
          <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Database error: {dbError}
          </p>
        ) : (
          <PaymentTable participants={participants} adminToken={adminToken} />
        )}
      </section>

      <section className="card" style={{ marginTop: '2rem' }}>
        <h2 className="card-title">Lock brackets</h2>
        <LockBracketsAdmin adminToken={adminToken} />
      </section>

      <section className="card" style={{ marginTop: '2rem' }}>
        <p className="page-subtitle">
          Set the team names for each seed and region in the current contest. This updates the{' '}
          <code>teams</code> table in Neon.
        </p>
        <TeamsAdmin adminToken={adminToken} initialTeams={teams} />
      </section>

      <section className="card" style={{ marginTop: '2rem' }}>
        <h2 className="card-title">Tournament results (scoring)</h2>
        <p className="page-subtitle">
          Set winners for each game to run scoring. Game id format: r1-1 … r6-1. Value 0 = first team won, 1 = second team won. Save and the scoreboard will update.
        </p>
        <ContestResultsAdmin adminToken={adminToken} />
      </section>
    </main>
  );
}
