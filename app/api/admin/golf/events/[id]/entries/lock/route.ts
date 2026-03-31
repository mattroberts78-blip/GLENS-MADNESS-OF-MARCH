import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';
import { getSessionFromRequest } from '@/lib/auth/session';

type Body = {
  token?: string;
  action?: 'lock' | 'unlock';
  mode?: 'all' | 'selected';
  entryIds?: number[];
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  const eventId = Number(params.id);
  if (!Number.isFinite(eventId)) return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!verifyAdminToken(String(body?.token ?? '')) || !session?.isAdmin || session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const action = body?.action === 'unlock' ? 'unlock' : 'lock';
  const mode = body?.mode === 'selected' ? 'selected' : 'all';
  const entryIds = (body?.entryIds ?? []).filter((id): id is number => Number.isFinite(id));

  let result;
  if (mode === 'selected' && entryIds.length > 0) {
    let updated = 0;
    if (action === 'lock') {
      for (const entryId of entryIds) {
        const r = await sql`
          UPDATE golf_entries
          SET locked_at = NOW()
          WHERE event_id = ${eventId}
            AND id = ${entryId}
        `;
        updated += r.rowCount ?? 0;
      }
    } else {
      for (const entryId of entryIds) {
        const r = await sql`
          UPDATE golf_entries
          SET locked_at = NULL
          WHERE event_id = ${eventId}
            AND id = ${entryId}
        `;
        updated += r.rowCount ?? 0;
      }
    }
    return NextResponse.json({ ok: true, updated });
  } else {
    if (action === 'lock') {
      result = await sql`UPDATE golf_entries SET locked_at = NOW() WHERE event_id = ${eventId}`;
    } else {
      result = await sql`UPDATE golf_entries SET locked_at = NULL WHERE event_id = ${eventId}`;
    }
  }

  return NextResponse.json({ ok: true, updated: result.rowCount ?? 0 });
}

