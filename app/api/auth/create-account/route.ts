import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sessionCookieForResponse } from '@/lib/auth/session';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_RE = /^\d{4}$/;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const pin = String(formData.get('pin') ?? '').trim();
  const confirmPin = String(formData.get('confirmPin') ?? '').trim();
  const rawBrackets = formData.get('brackets');
  const numBrackets = Math.min(20, Math.max(1, Number(rawBrackets) || 1));

  const errUrl = (code: string) => {
    const url = new URL('/create-account', request.url);
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, 302);
  };

  if (!email || !EMAIL_RE.test(email)) return errUrl('email');
  if (!PIN_RE.test(pin)) return errUrl('pin');
  if (pin !== confirmPin) return errUrl('confirm');

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

    const redirectUrl = new URL('/', request.url);
    const res = NextResponse.redirect(redirectUrl, { status: 302 });
    // Cookie must be set on this response so the browser has session on GET /
    const cookie = sessionCookieForResponse({
      credentialId,
      username: email,
      isAdmin: false,
    });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === '23505') return errUrl('duplicate');
    console.error('[create-account]', e);
    return errUrl('unknown');
  }
}
