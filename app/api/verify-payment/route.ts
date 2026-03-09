import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = String(formData.get('_token') ?? '');

  if (!verifyAdminToken(token)) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting…</title></head><body><p>Session expired. Redirecting…</p><script>window.location.href="/admin";</script></body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const id = Number(formData.get('credentialId'));
  const action = String(formData.get('action') ?? '');

  if (Number.isFinite(id)) {
    const ts = action === 'verify' ? new Date().toISOString() : null;
    await sql`
      UPDATE credentials
      SET payment_verified_at = ${ts}
      WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
    `;
  }

  const url = new URL('/admin', request.url);

  // Return an HTML page that redirects via JavaScript.
  // A server 303 redirect doesn't carry the session cookie on this hosting setup,
  // but a fresh JS navigation does (same as typing the URL in the address bar).
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting…</title></head><body><p>Updated. Redirecting…</p><script>window.location.href="${url.pathname}";</script></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}
