import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sessionCookieForResponse } from '@/lib/auth/session';
import { signAdminToken } from '@/lib/auth/admin-token';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const username = String(formData.get('username') || '').trim();
    const password = String(formData.get('password') || '');

    if (!username || !password) {
      const url = new URL('/login', request.url);
      url.searchParams.set('error', '1');
      return NextResponse.redirect(url, 302);
    }

    const result = await sql`
      SELECT id, username, password,
             (LOWER(TRIM(username)) = 'admin') AS is_admin
      FROM credentials
      WHERE LOWER(TRIM(username)) = LOWER(${username})
      LIMIT 1
    `;
    const row = result.rows[0] as
      | { id: number; username: string; password: string; is_admin: unknown }
      | undefined;

    if (!row || row.password !== password) {
      const url = new URL('/login', request.url);
      url.searchParams.set('error', '1');
      return NextResponse.redirect(url, 302);
    }

    const isAdmin = row.is_admin === true || row.is_admin === 't';
    const session = {
      credentialId: Number(row.id),
      username: row.username,
      isAdmin,
    };

    const redirectPath = isAdmin ? '/admin' : '/';
    const redirectUrl = new URL(redirectPath, request.url);

    if (isAdmin) {
      redirectUrl.searchParams.set('t', signAdminToken());
    }

    // Use 200 + Set-Cookie + meta refresh instead of 302 so the cookie is stored
    // before the next navigation (avoids browser "cookie too late" on 302-after-POST).
    const cookie = sessionCookieForResponse(session);
    const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${redirectUrl.toString().replace(/&/g, '&amp;')}"></head><body>Redirecting…</body></html>`;
    const res = new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (err: unknown) {
    console.error('[login route]', err);
    const url = new URL('/login', request.url);
    url.searchParams.set('error', '1');
    url.searchParams.set('msg', err instanceof Error ? err.message : 'unknown');
    return NextResponse.redirect(url, 302);
  }
}
