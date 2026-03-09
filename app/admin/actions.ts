'use server';

import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export type MarkPaymentState = { ok: boolean; error?: string; updatedId?: number };

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
    const result = await sql`
      UPDATE credentials
      SET payment_verified_at = ${verifyAction === 'verify' ? new Date().toISOString() : null}
      WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
    `;
    const rowCount = result.rowCount ?? 0;
    if (rowCount === 0) {
      return { ok: false, error: `Update affected 0 rows (credentialId=${id}). Check participant id.` };
    }
    revalidatePath('/admin');
    return { ok: true, updatedId: id };
  } catch (err) {
    console.error('[markPaymentVerified]', err);
    return { ok: false, error: 'Database update failed.' };
  }
}
