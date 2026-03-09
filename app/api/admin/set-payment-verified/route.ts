import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Session is already checked by middleware for /api/admin/* — cookie is read there.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const id = Number(formData.get('credentialId'));
  const verifyAction = String(formData.get('action') ?? '');

  if (Number.isFinite(id)) {
    await sql`
      UPDATE credentials
      SET payment_verified_at = ${verifyAction === 'verify' ? new Date().toISOString() : null}
      WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
    `;
  }

  const adminUrl = new URL('/admin', request.url);
  return NextResponse.redirect(adminUrl, 303);
}
