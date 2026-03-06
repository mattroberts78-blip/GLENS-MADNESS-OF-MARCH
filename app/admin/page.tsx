import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';

function generateSixDigitPassword(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, '0');
}

async function createCredential(formData: FormData) {
  'use server';

  const session = getSession();
  if (!session || !session.isAdmin) redirect('/login');

  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  if (!username) redirect('/admin?error=username');

  const password = generateSixDigitPassword();

  try {
    await sql`INSERT INTO credentials (username, password) VALUES (${username}, ${password})`;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === '23505') redirect('/admin?error=duplicate');
    throw e;
  }

  redirect(`/admin?created=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { created?: string; password?: string; error?: string };
}) {
  const session = getSession();

  if (!session || !session.isAdmin) {
    redirect('/login');
  }

  const listResult =
    await sql`SELECT id, username, password, used_at FROM credentials WHERE username <> 'admin' ORDER BY used_at IS NULL DESC, id ASC LIMIT 50`;
  const creds = listResult.rows as {
    id: number;
    username: string;
    password: string;
    used_at: string | null;
  }[];

  const created = searchParams?.created ? decodeURIComponent(searchParams.created) : null;
  const newPassword = searchParams?.password ? decodeURIComponent(searchParams.password) : null;
  const error = searchParams?.error;

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
          Assign new credential
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          Enter the participant&apos;s username (e.g. their email). A 6-digit password will be generated.
        </p>
        <form action={createCredential} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            Username
            <input
              type="text"
              name="username"
              placeholder="participant@example.com"
              required
              style={{
                padding: '0.5rem',
                borderRadius: 6,
                border: '1px solid #334155',
                background: 'var(--bg)',
                color: 'var(--text)',
                minWidth: 220,
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Generate login
          </button>
        </form>
        {error === 'username' && (
          <p style={{ color: '#f97373', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Please enter a username.
          </p>
        )}
        {error === 'duplicate' && (
          <p style={{ color: '#f97373', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            That username is already in use.
          </p>
        )}
      </section>

      {created && newPassword && (
        <section
          style={{
            padding: '1rem',
            background: '#0f172a',
            border: '1px solid var(--accent)',
            borderRadius: 8,
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            Created — copy and email to participant
          </h2>
          <p style={{ marginBottom: '0.25rem' }}>
            <strong>Username:</strong> {created}
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Password:</strong> {newPassword}
          </p>
        </section>
      )}

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
