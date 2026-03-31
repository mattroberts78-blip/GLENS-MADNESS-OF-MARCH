import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';
import { getSessionFromRequest } from '@/lib/auth/session';

const PIN_RE = /^\d{4}$/;

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  const formData = await request.formData();
  const token = String(formData.get('_token') ?? '');

  if (!verifyAdminToken(token) || !session?.isAdmin || session.contest !== 'basketball') {
    return new NextResponse(
      '<html><body><script>parent.postMessage("auth-error","*");</script></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    );
  }

  const id = Number(formData.get('credentialId'));
  const pin = String(formData.get('pin') ?? '').trim();

  if (!Number.isFinite(id) || !PIN_RE.test(pin)) {
    return new NextResponse(
      '<html><body><script>parent.postMessage("pin-error","*");</script></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    );
  }

  await sql`
    UPDATE credentials
    SET password = ${pin}
    WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
  `;

  return new NextResponse(
    '<html><body><script>parent.postMessage("pin-updated","*");</script></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  );
}

