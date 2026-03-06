import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';

export default async function AdminPage() {
  const session = getSession();

  if (!session || !session.isAdmin) {
    redirect('/login');
  }

  const nextResult =
    await sql`SELECT id, username, password, used_at FROM credentials WHERE username <> 'admin' AND used_at IS NULL ORDER BY id ASC LIMIT 1`;
  const next = nextResult.rows[0] as
    | { id: number; username: string; password: string; used_at: string | null }
    | undefined;

  const listResult =
    await sql`SELECT id, username, password, used_at FROM credentials WHERE username <> 'admin' ORDER BY used_at IS NULL DESC, id ASC LIMIT 20`;
  const creds = listResult.rows as {
    id: number;
    username: string;
    password: string;
    used_at: string | null;
  }[];

  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Admin</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Logged in as <strong>{session.username}</strong>.
      </p>

      <section
        style={{
          padding: '1rem',
          background: 'var(--surface)',
          borderRadius: 8,
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
          Next available login
        </h2>
        {next ? (
          <>
            <p style={{ marginBottom: '0.25rem' }}>
              <strong>Username:</strong> {next.username}
            </p>
            <p style={{ marginBottom: 0 }}>
              <strong>Password:</strong> {next.password}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Email this pair to the next paid participant. Later we&apos;ll add
              a one-click &quot;mark as used&quot; action.
            </p>
          </>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            No unused credentials found. Seed some credentials first.
          </p>
        )}
      </section>

      <section
        style={{
          padding: '1rem',
          background: 'var(--surface)',
          borderRadius: 8,
        }}
      >
        <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
          Recent credentials
        </h2>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>
                Username
              </th>
              <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>
                Password
              </th>
              <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {creds.map((c) => (
              <tr key={c.id}>
                <td
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderTop: '1px solid #0f172a',
                  }}
                >
                  {c.username}
                </td>
                <td
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderTop: '1px solid #0f172a',
                  }}
                >
                  {c.password}
                </td>
                <td
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderTop: '1px solid #0f172a',
                    color: c.used_at ? 'var(--muted)' : '#4ade80',
                  }}
                >
                  {c.used_at ? 'Used' : 'Available'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
