import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { setSession } from '@/lib/auth/session';

async function login(formData: FormData) {
  'use server';

  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');

  if (!username || !password) {
    redirect('/login?error=1');
  }

  const result =
    await sql`
    SELECT id, username, password,
           (LOWER(TRIM(username)) = 'admin') AS is_admin
    FROM credentials
    WHERE LOWER(TRIM(username)) = LOWER(${username.trim()})
    LIMIT 1`;
  const row = result.rows[0] as
    | { id: number; username: string; password: string; is_admin: unknown }
    | undefined;

  if (!row || row.password !== password) {
    redirect('/login?error=1');
  }

  const isAdmin = row.is_admin === true || row.is_admin === 't';
  setSession({
    credentialId: row.id,
    username: row.username,
    isAdmin,
  });

  if (isAdmin) {
    redirect('/admin');
  }

  redirect('/');
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const showError = searchParams?.error === '1';

  return (
    <main className="page-container" style={{ maxWidth: 420 }}>
      <h1 className="page-title">Log in</h1>
      <p className="page-subtitle">
        Participants: use your email and 4-digit PIN. Admins: use username <strong>admin</strong> and your admin password.
      </p>
      {showError && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Invalid credentials.
        </p>
      )}
      <form action={login} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Email or admin username
          <input type="text" name="username" autoComplete="username" placeholder="you@example.com or admin" className="input" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          PIN or password
          <input type="password" name="password" autoComplete="current-password" placeholder="••••" className="input" style={{ width: 120 }} />
        </label>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
          Log in
        </button>
      </form>
    </main>
  );
}
