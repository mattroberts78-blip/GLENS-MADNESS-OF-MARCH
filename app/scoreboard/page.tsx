import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function ScoreboardPage() {
  const session = await getSession();
  if (!session || session.isAdmin) redirect('/login');

  return (
    <main className="page-container">
      <p style={{ marginBottom: '1rem' }}>
        <Link href="/" className="nav-link">← Back to your brackets</Link>
      </p>
      <h1 className="page-title">Scoreboard</h1>
      <p className="page-subtitle">
        Live standings and max remaining points will appear here once the contest has games and results. Only participants with payment verified by admin will count toward the overall winner.
      </p>
    </main>
  );
}
