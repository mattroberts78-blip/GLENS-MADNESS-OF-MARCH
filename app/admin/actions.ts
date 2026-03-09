'use server';

import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';

export type MarkPaymentState = { ok: boolean; error?: string };

export async function markPaymentVerified(
  _prev: MarkPaymentState,
  formData: FormData,
): Promise<MarkPaymentState> {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }

  const id = Number(formData.get('credentialId'));
  const verifyAction = String(formData.get('action') ?? '');

  if (!Number.isFinite(id)) {
    return { ok: false, error: 'Invalid request.' };
  }

  try {
    await sql`
      UPDATE credentials
      SET payment_verified_at = ${verifyAction === 'verify' ? new Date().toISOString() : null}
      WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
    `;
    return { ok: true };
  } catch (err) {
    console.error('[markPaymentVerified]', err);
    return { ok: false, error: 'Database update failed.' };
  }
}
