import { redirect } from 'next/navigation';
import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { setSession } from '@/lib/auth/session';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_RE = /^\d{4}$/;

async function createAccount(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const pin = String(formData.get('pin') ?? '').trim();
  const confirmPin = String(formData.get('confirmPin') ?? '').trim();
  const rawBrackets = formData.get('brackets');
  const numBrackets = Math.min(20, Math.max(1, Number(rawBrackets) || 1));

  if (!email || !EMAIL_RE.test(email)) {
    redirect('/create-account?error=email');
  }
  if (!PIN_RE.test(pin)) {
    redirect('/create-account?error=pin');
  }
  if (pin !== confirmPin) {
    redirect('/create-account?error=confirm');
  }

  try {
    const result = await sql`
      INSERT INTO credentials (username, password)
      VALUES (${email}, ${pin})
      RETURNING id
    `;
    const credentialId = (result.rows[0] as { id: number }).id;

    for (let i = 1; i <= numBrackets; i += 1) {
      await sql`
        INSERT INTO entries (credential_id, name)
        VALUES (${credentialId}, ${`Bracket ${i}`})
      `;
    }

    setSession({
      credentialId,
      username: email,
      isAdmin: false,
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === '23505') redirect('/create-account?error=duplicate');
    throw e;
  }

  redirect('/');
}

export default function CreateAccountPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const error = searchParams?.error;

  return (
    <main className="page-container" style={{ maxWidth: 420 }}>
      <h1 className="page-title">Create account</h1>
      <p className="page-subtitle">
        Enter your email and choose a 4-digit PIN. You&apos;ll use these to log in. Select how many brackets you want to play.
      </p>

      {error === 'email' && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Please enter a valid email address.
        </p>
      )}
      {error === 'pin' && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          PIN must be exactly 4 digits.
        </p>
      )}
      {error === 'confirm' && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          PIN and confirmation do not match.
        </p>
      )}
      {error === 'duplicate' && (
        <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          An account with that email already exists. <Link href="/login">Log in</Link> instead.
        </p>
      )}

      <form action={createAccount} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className="input"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          4-digit PIN
          <input
            type="password"
            name="pin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            placeholder="••••"
            required
            className="input"
            style={{ width: 120 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Confirm 4-digit PIN
          <input
            type="password"
            name="confirmPin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            placeholder="••••"
            required
            className="input"
            style={{ width: 120 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Number of brackets
          <input
            type="number"
            name="brackets"
            min={1}
            max={20}
            defaultValue={1}
            required
            className="input"
            style={{ width: 88 }}
          />
        </label>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
          Create account
        </button>
      </form>

      <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
