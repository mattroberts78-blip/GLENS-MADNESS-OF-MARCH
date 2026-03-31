import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function GET() {
  // Read-only list for admin UI preload.
  const result = await sql`
    SELECT id, name, starts_at, lock_at, is_active
    FROM golf_events
    ORDER BY starts_at DESC NULLS LAST, id DESC
  `;
  return NextResponse.json({ events: result.rows });
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    name?: string;
    startsAt?: string | null;
    lockAt?: string | null;
    isActive?: boolean;
  } | null;

  if (!verifyAdminToken(String(body?.token ?? '')) || !session?.isAdmin || session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const name = String(body?.name ?? '').trim();
  if (!name) return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });

  const inserted = await sql`
    INSERT INTO golf_events (name, starts_at, lock_at, is_active)
    VALUES (${name}, ${body?.startsAt ?? null}, ${body?.lockAt ?? null}, ${body?.isActive ?? true})
    RETURNING id
  `;
  return NextResponse.json({ ok: true, id: (inserted.rows[0] as { id: number }).id });
}
