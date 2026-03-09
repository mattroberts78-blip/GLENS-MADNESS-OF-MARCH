'use server';

import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function markPaymentVerified(formData: FormData) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    redirect('/login?reason=session_expired');
  }

  const id = Number(formData.get('credentialId'));
  const action = String(formData.get('action') ?? '');

  if (!Number.isFinite(id)) return;

  try {
    await sql`
      UPDATE credentials
      SET payment_verified_at = ${action === 'verify' ? new Date().toISOString() : null}
      WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
    `;
  } catch (err) {
    console.error('[markPaymentVerified]', err);
  }

  revalidatePath('/admin');
}
