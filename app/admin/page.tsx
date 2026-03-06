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

  const rawCount = formData.get('entries');
  const entryCount = Math.min(20, Math.max(1, Number(rawCount) || 1));

  const password = generateSixDigitPassword();

  try {
    const result = await sql`
      INSERT INTO credentials (username, password)
      VALUES (${username}, ${password})
      RETURNING id
    `;
    const credentialId = (result.rows[0] as { id: number }).id;

    for (let i = 1; i <= entryCount; i += 1) {
      await sql`
        INSERT INTO entries (credential_id, name)
        VALUES (${credentialId}, ${`Bracket ${i}`})
      `;
    }
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === '23505') redirect('/admin?error=duplicate');
    throw e;
  }

  redirect(`/admin?created=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&entries=${entryCount}`);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { created?: string; password?: string; error?: string; entries?: string };
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
  const entriesCreated = searchParams?.entries ?? null;
  const error = searchParams?.error;

  return (
    <main className="page-container" style={{ maxWidth: 820 }}>
      <h1 className="page-title">Admin</h1>
      <p className="page-subtitle">
        Glen&apos;s Madness of March — Logged in as <strong>{session.username}</strong>.
      </p>

      <section className="card">
        <h2 className="card-title">Assign new credential</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Enter the participant&apos;s username (e.g. their email) and how many brackets they paid for. A 6-digit password will be generated.
        </p>
        <form action={createCredential} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
            Username
            <input type="text" name="username" placeholder="participant@example.com" required className="input" style={{ minWidth: 220 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
            Entries (brackets)
            <input type="number" name="entries" min={1} max={20} defaultValue={1} className="input" style={{ width: 88 }} />
          </label>
          <button type="submit" className="btn btn-primary">
            Generate login
          </button>
        </form>
        {error === 'username' && (
          <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Please enter a username.
          </p>
        )}
        {error === 'duplicate' && (
          <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            That username is already in use.
          </p>
        )}
      </section>

      {created && newPassword && (
        <section className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
          <h2 className="card-title">Created — copy and email to participant</h2>
          <p style={{ marginBottom: '0.25rem' }}>
            <strong>Username:</strong> {created}
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Password:</strong> {newPassword}
          </p>
          {entriesCreated && (
            <p style={{ marginTop: '0.5rem', marginBottom: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {entriesCreated} bracket{entriesCreated === '1' ? '' : 's'} created for this user.
            </p>
          )}
        </section>
      )}

      <section className="card">
        <h2 className="card-title">Recent credentials</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Username</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Password</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {creds.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{c.username}</td>
                <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{c.password}</td>
                <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)', color: c.used_at ? 'var(--text-muted)' : 'var(--success)' }}>
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
