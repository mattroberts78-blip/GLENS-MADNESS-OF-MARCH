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
  const verifyAction = String(formData.get('action') ?? '');

  if (!Number.isFinite(id)) {
    redirect('/admin');
  }

  await sql`
    UPDATE credentials
    SET payment_verified_at = ${verifyAction === 'verify' ? new Date().toISOString() : null}
    WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
  `;

  revalidatePath('/admin');
  redirect('/admin');
}
