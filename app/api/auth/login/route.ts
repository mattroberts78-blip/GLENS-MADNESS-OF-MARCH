import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sessionCookieForResponse } from '@/lib/auth/session';
import { signAdminToken } from '@/lib/auth/admin-token';

export async function POST(request: NextRequest) {
  let contest: 'basketball' | 'golf' = 'basketball';
  try {
    const formData = await request.formData();
    const username = String(formData.get('username') || '').trim();
    const password = String(formData.get('password') || '');
    contest = String(formData.get('contest') || '').trim().toLowerCase() === 'golf' ? 'golf' : 'basketball';

    if (!username || !password) {
      const url = new URL('/login', request.url);
      url.searchParams.set('error', '1');
      url.searchParams.set('contest', contest);
      return NextResponse.redirect(url, 302);
    }

    let result;
    try {
      result = await sql`
        SELECT id, username, password,
               (LOWER(TRIM(username)) = 'admin') AS is_admin
        FROM credentials
        WHERE LOWER(TRIM(username)) = LOWER(${username})
          AND contest_type = ${contest}
        LIMIT 1
      `;
    } catch (queryErr: unknown) {
      // Backward compatibility: if migration wasn't applied yet, credentials has no contest_type.
      const err = queryErr as { code?: string };
      if (err?.code === '42703') {
        if (contest !== 'basketball') {
          const url = new URL('/login', request.url);
          url.searchParams.set('error', '1');
          url.searchParams.set('contest', contest);
          url.searchParams.set('msg', 'golf_not_migrated');
          return NextResponse.redirect(url, 302);
        }
        result = await sql`
          SELECT id, username, password,
                 (LOWER(TRIM(username)) = 'admin') AS is_admin
          FROM credentials
          WHERE LOWER(TRIM(username)) = LOWER(${username})
          LIMIT 1
        `;
      } else {
        throw queryErr;
      }
    }
    const row = result.rows[0] as
      | { id: number; username: string; password: string; is_admin: unknown }
      | undefined;

    if (!row || row.password !== password) {
      const url = new URL('/login', request.url);
      url.searchParams.set('error', '1');
      url.searchParams.set('contest', contest);
      return NextResponse.redirect(url, 302);
    }

    const isAdmin = row.is_admin === true || row.is_admin === 't';
    const session = {
      credentialId: Number(row.id),
      username: row.username,
      isAdmin,
      contest,
    };

    const redirectPath = isAdmin ? '/admin' : contest === 'golf' ? '/golf' : '/';
    const redirectUrl = new URL(redirectPath, request.url);

    if (isAdmin) {
      redirectUrl.searchParams.set('t', signAdminToken());
    }

    const res = NextResponse.redirect(redirectUrl, { status: 302 });

    // Set the session cookie on the redirect response so the browser has it
    // before loading the destination page.
    const cookie = sessionCookieForResponse(session);
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (err: unknown) {
    console.error('[login route]', err);
    const url = new URL('/login', request.url);
    url.searchParams.set('error', '1');
    url.searchParams.set('contest', contest);
    url.searchParams.set('msg', err instanceof Error ? err.message : 'unknown');
    return NextResponse.redirect(url, 302);
  }
}
