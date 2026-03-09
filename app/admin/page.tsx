import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { signAdminToken, verifyAdminToken } from '@/lib/auth/admin-token';
import { PaymentTable } from '@/components/PaymentTable';

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
    </main>
  );
}
