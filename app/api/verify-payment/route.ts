import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = String(formData.get('_token') ?? '');

  if (!verifyAdminToken(token)) {
    return new NextResponse(
      '<html><body><script>parent.postMessage("auth-error","*");</script></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    );
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

  return new NextResponse(
    '<html><body><script>parent.postMessage("payment-updated","*");</script></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  );
}
