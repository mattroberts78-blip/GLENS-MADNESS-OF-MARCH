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
    await sql`SELECT id, username, password, (username = 'admin') AS is_admin FROM credentials WHERE username = ${username} LIMIT 1`;
  const row = result.rows[0] as
    | { id: number; username: string; password: string; is_admin: boolean }
    | undefined;

  if (!row || row.password !== password) {
    redirect('/login?error=1');
  }

  setSession({
    credentialId: row.id,
    username: row.username,
    isAdmin: row.is_admin,
  });

  if (row.is_admin) {
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
        Use the username and password you received for Glen&apos;s Madness of March.
      </p>
      {showError && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Invalid username or password.
        </p>
      )}
      <form action={login} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Username
          <input type="text" name="username" autoComplete="username" className="input" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Password
          <input type="password" name="password" autoComplete="current-password" className="input" />
        </label>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
          Log in
        </button>
      </form>
    </main>
  );
}
