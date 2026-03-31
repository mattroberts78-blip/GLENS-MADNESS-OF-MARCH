import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { normalizeGolfRoundNum } from '@/lib/golf/normalizeRound';
import { scoreGolfEntries } from '@/lib/golf/scoring';
import { GolfLeaderboardTable, type GolfLeaderboardRow } from '@/components/golf/GolfLeaderboardTable';

export const dynamic = 'force-dynamic';

export default async function GolfLeaderboardPage({ params }: { params: { eventId: string } }) {
  const eventId = Number(params.eventId);
  if (!Number.isFinite(eventId)) redirect('/golf');

  const [eventResult, rowsResult, roundScoresResult] = await Promise.all([
    sql`SELECT id, name, winner_strokes FROM golf_events WHERE id = ${eventId} LIMIT 1`,
    (async () => {
      try {
        return await sql`
          SELECT
            e.id AS entry_id,
            e.submitted_at,
            e.tiebreaker_winner_strokes,
            c.username,
            c.first_name,
            c.last_name,
            t.tier_number,
            g.id AS golfer_id,
            g.name AS golfer_name
          FROM golf_entries e
          JOIN credentials c ON c.id = e.credential_id
          LEFT JOIN golf_entry_picks p ON p.entry_id = e.id
          LEFT JOIN golf_tiers t ON t.id = p.tier_id
          LEFT JOIN golf_golfers g ON g.id = p.golfer_id
          WHERE e.event_id = ${eventId}
          ORDER BY e.id ASC, t.tier_number ASC NULLS LAST
        `;
      } catch (err) {
        const pg = err as { code?: string };
        if (pg?.code !== '42703') throw err;
        return sql`
          SELECT
            e.id AS entry_id,
            NULL::timestamptz AS submitted_at,
            e.tiebreaker_winner_strokes,
            c.username,
            c.first_name,
            c.last_name,
            t.tier_number,
            g.id AS golfer_id,
            g.name AS golfer_name
          FROM golf_entries e
          JOIN credentials c ON c.id = e.credential_id
          LEFT JOIN golf_entry_picks p ON p.entry_id = e.id
          LEFT JOIN golf_tiers t ON t.id = p.tier_id
          LEFT JOIN golf_golfers g ON g.id = p.golfer_id
          WHERE e.event_id = ${eventId}
          ORDER BY e.id ASC, t.tier_number ASC NULLS LAST
        `;
      }
    })(),
    sql`
      SELECT golfer_id, round_num AS round, strokes, made_cut
      FROM golf_round_scores
      WHERE event_id = ${eventId}
    `,
  ]);

  const event = eventResult.rows[0] as { id: number; name: string; winner_strokes: number | null } | undefined;
  if (!event) redirect('/golf');

  const rawRows = rowsResult.rows as {
    entry_id: number;
    submitted_at: string | null;
    tiebreaker_winner_strokes: number | null;
    username: string;
    first_name: string | null;
    last_name: string | null;
    tier_number: number | null;
    golfer_id: number | null;
    golfer_name: string | null;
  }[];

  const roundRowsRaw = roundScoresResult.rows as {
    golfer_id: number;
    round: number;
    strokes: number | null;
    made_cut: boolean;
  }[];

  const roundRows = roundRowsRaw
    .map((r) => {
      const round = normalizeGolfRoundNum(r.round);
      if (round == null) return null;
      const golfer_id = Number(r.golfer_id);
      if (!Number.isFinite(golfer_id)) return null;
      return { golfer_id, round, strokes: r.strokes, made_cut: r.made_cut };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  const roundScoresForEngine = roundRows.map((r) => ({
    golferId: r.golfer_id,
    round: r.round,
    strokes: r.strokes,
    madeCut: r.made_cut,
  }));

  type EntryAgg = {
    name: string;
    tiebreaker: number | null;
    submittedAt: string | null;
    picks: number[];
    pickRows: { tierNumber: number; golferId: number; golferName: string }[];
  };

  const byEntry = new Map<number, EntryAgg>();
  for (const row of rawRows) {
    if (!byEntry.has(row.entry_id)) {
      const displayName =
        `${(row.first_name ?? '').trim()} ${(row.last_name ?? '').trim()}`.trim() || row.username;
      byEntry.set(row.entry_id, {
        name: displayName,
        tiebreaker: row.tiebreaker_winner_strokes,
        submittedAt: row.submitted_at,
        picks: [],
        pickRows: [],
      });
    }
    if (row.golfer_id != null && row.tier_number != null && row.golfer_name != null) {
      const gid = Number(row.golfer_id);
      if (!Number.isFinite(gid)) continue;
      const agg = byEntry.get(row.entry_id)!;
      agg.picks.push(gid);
      agg.pickRows.push({
        tierNumber: row.tier_number,
        golferId: gid,
        golferName: row.golfer_name,
      });
    }
  }

  const scored = scoreGolfEntries(
    Array.from(byEntry.entries()).map(([entryId, data]) => ({
      entryId,
      tiebreakerWinnerStrokes: data.tiebreaker,
      picks: data.picks,
    })),
    roundScoresForEngine,
    event.winner_strokes
  ).map((score) => ({ ...score, name: byEntry.get(score.entryId)?.name ?? `Entry ${score.entryId}` }));

  scored.sort((a, b) => {
    if (a.total !== b.total) return a.total - b.total;
    const ad = a.tiebreakerDelta ?? Number.MAX_SAFE_INTEGER;
    const bd = b.tiebreakerDelta ?? Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });

  const strokeMap = new Map<number, { r1: number | null; r2: number | null; r3: number | null; r4: number | null }>();
  for (const r of roundRows) {
    if (!strokeMap.has(r.golfer_id)) {
      strokeMap.set(r.golfer_id, { r1: null, r2: null, r3: null, r4: null });
    }
    const row = strokeMap.get(r.golfer_id)!;
    const s = r.strokes;
    if (r.round === 1) row.r1 = s;
    if (r.round === 2) row.r2 = s;
    if (r.round === 3) row.r3 = s;
    if (r.round === 4) row.r4 = s;
  }

  const leaderboardRows: GolfLeaderboardRow[] = scored.map((s, idx) => {
    const agg = byEntry.get(s.entryId)!;
    const pickRows = [...agg.pickRows].sort((a, b) => a.tierNumber - b.tierNumber);
    const picks = pickRows.map((p) => {
      const st = strokeMap.get(p.golferId);
      return {
        tierNumber: p.tierNumber,
        golferName: p.golferName,
        r1: st?.r1 ?? null,
        r2: st?.r2 ?? null,
        r3: st?.r3 ?? null,
        r4: st?.r4 ?? null,
      };
    });
    return {
      entryId: s.entryId,
      rank: idx + 1,
      name: s.name,
      round1: s.round1,
      round2: s.round2,
      round3: s.round3,
      round4: s.round4,
      total: Number.isFinite(s.total) ? s.total : null,
      submittedAt: agg.submittedAt,
      picks,
    };
  });

  return (
    <main className="page-container">
      <h1 className="page-title">{event.name} - Leaderboard</h1>
      <p className="page-subtitle">Rounds score as best 6/5/4/4 picks, with cut rule for rounds 3 and 4.</p>
      <GolfLeaderboardTable rows={leaderboardRows} />
    </main>
  );
}
