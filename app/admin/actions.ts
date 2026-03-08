'use server';

import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';

export type SetPaymentResult = { ok: true } | { ok: false; error: string };

export async function setPaymentVerified(
  credentialId: number,
  action: 'verify' | 'unverify',
): Promise<SetPaymentResult> {
  const session = getSession();
  if (!session) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }
  if (!session.isAdmin) {
    return { ok: false, error: 'Admin access required.' };
  }

  if (!Number.isFinite(credentialId)) {
    return { ok: false, error: 'Invalid participant.' };
  }

  try {
    await sql`
      UPDATE credentials
      SET payment_verified_at = ${action === 'verify' ? new Date().toISOString() : null}
      WHERE id = ${credentialId} AND LOWER(TRIM(username)) <> 'admin'
    `;
    return { ok: true };
  } catch (err) {
    console.error('[setPaymentVerified]', err);
    return { ok: false, error: 'Database update failed.' };
  }
}
