'use server';

import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export type MarkPaymentState = { ok: boolean; error?: string; debug?: string };

export async function markPaymentVerified(
  _prev: MarkPaymentState,
  formData: FormData,
): Promise<MarkPaymentState> {
  const debugParts: string[] = [];

  try {
    const session = await getSession();
    debugParts.push(`session=${session ? 'yes' : 'no'}, isAdmin=${session?.isAdmin}`);

    if (!session || !session.isAdmin) {
      return { ok: false, error: 'Session expired.', debug: debugParts.join(' | ') };
    }

    const id = Number(formData.get('credentialId'));
    const verifyAction = String(formData.get('action') ?? '');
    debugParts.push(`id=${id}, action=${verifyAction}`);

    if (!Number.isFinite(id)) {
      return { ok: false, error: 'Invalid id.', debug: debugParts.join(' | ') };
    }

    const ts = verifyAction === 'verify' ? new Date().toISOString() : null;
    debugParts.push(`setting payment_verified_at=${ts}`);

    const result = await sql`
      UPDATE credentials
      SET payment_verified_at = ${ts}
      WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
    `;
    debugParts.push(`rowCount=${result.rowCount}`);

    const check = await sql`SELECT id, payment_verified_at FROM credentials WHERE id = ${id}`;
    debugParts.push(`after_update=${JSON.stringify(check.rows[0])}`);

    revalidatePath('/admin');
    return { ok: true, debug: debugParts.join(' | ') };
  } catch (err) {
    debugParts.push(`error=${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, error: 'Action failed.', debug: debugParts.join(' | ') };
  }
}
