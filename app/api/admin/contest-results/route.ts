import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';
import { getSessionFromRequest } from '@/lib/auth/session';
import type { ResultsJson } from '@/lib/scoring';

type SetBody = {
  token: string;
  results: ResultsJson;
};

export async function GET() {
  try {
    const contestResult = await sql`
      SELECT id, name, results_json
      FROM contests
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const row = contestResult.rows[0] as { id: number; name: string; results_json: unknown } | undefined;
    if (!row) return NextResponse.json({ contest: null, results: null });
    return NextResponse.json({
      contest: { id: row.id, name: row.name },
      results: row.results_json as ResultsJson | null,
    });
  } catch (err) {
    console.error('[contest-results GET]', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  let body: SetBody;
  try {
    body = (await request.json()) as SetBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const token = String(body.token ?? '');
  if (!verifyAdminToken(token) || !session?.isAdmin || session.contest !== 'basketball') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!body.results || typeof body.results !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  try {
    const contestResult = await sql`
      SELECT id FROM contests ORDER BY created_at DESC LIMIT 1
    `;
    const contestRow = contestResult.rows[0] as { id: number } | undefined;
    if (!contestRow) {
      return NextResponse.json({ ok: false, error: 'no_contest' }, { status: 400 });
    }

    await sql`
      UPDATE contests
      SET results_json = ${JSON.stringify(body.results)}::jsonb
      WHERE id = ${contestRow.id}
    `;
    return NextResponse.json({ ok: true, contestId: contestRow.id });
  } catch (err) {
    console.error('[contest-results POST]', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
