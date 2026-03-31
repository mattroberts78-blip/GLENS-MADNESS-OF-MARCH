import { normalizeGolfRoundNum } from '@/lib/golf/normalizeRound';

export type GolfRoundScore = {
  golferId: number;
  round: 1 | 2 | 3 | 4;
  strokes: number | null;
  madeCut: boolean;
};

export type GolfEntryScoreInput = {
  entryId: number;
  tiebreakerWinnerStrokes: number | null;
  picks: number[];
};

export type GolfEntryScoreResult = {
  entryId: number;
  round1: number;
  round2: number;
  /** Null when the entry did not qualify for weekend scoring (cut rule). */
  round3: number | null;
  round4: number | null;
  total: number;
  cutQualified: boolean;
  tiebreakerDelta: number | null;
};

const ROUND_PICK_COUNTS: Record<1 | 2 | 3 | 4, number> = {
  1: 6,
  2: 5,
  3: 4,
  4: 4,
};

function sumBest(scores: Array<number | null>, take: number): number {
  const usable = scores.filter((s): s is number => Number.isFinite(s));
  if (usable.length < take) return Number.POSITIVE_INFINITY;
  usable.sort((a, b) => a - b);
  return usable.slice(0, take).reduce((acc, n) => acc + n, 0);
}

export function scoreGolfEntries(
  entries: GolfEntryScoreInput[],
  roundScores: GolfRoundScore[],
  winnerStrokes: number | null
): GolfEntryScoreResult[] {
  const normalizedRows: GolfRoundScore[] = [];
  for (const row of roundScores) {
    const round = normalizeGolfRoundNum(row.round);
    if (round == null) continue;
    const golferId = Number(row.golferId);
    if (!Number.isFinite(golferId)) continue;
    normalizedRows.push({ ...row, golferId, round });
  }

  const byGolfer = new Map<number, GolfRoundScore[]>();
  for (const row of normalizedRows) {
    if (!byGolfer.has(row.golferId)) byGolfer.set(row.golferId, []);
    byGolfer.get(row.golferId)!.push(row);
  }

  return entries.map((entry) => {
    const pickedRounds = entry.picks.map((golferId) => byGolfer.get(golferId) ?? []);
    const madeCutCount = pickedRounds.filter((rows) => rows.some((r) => r.round === 2 && r.madeCut)).length;
    const cutQualified = madeCutCount >= 4;

    const roundScoresByNumber = (round: 1 | 2 | 3 | 4): Array<number | null> =>
      pickedRounds.map((rows) => rows.find((r) => r.round === round)?.strokes ?? null);

    const round1 = sumBest(roundScoresByNumber(1), ROUND_PICK_COUNTS[1]);
    const round2 = sumBest(roundScoresByNumber(2), ROUND_PICK_COUNTS[2]);
    const round3 = cutQualified ? sumBest(roundScoresByNumber(3), ROUND_PICK_COUNTS[3]) : Number.POSITIVE_INFINITY;
    const round4 = cutQualified ? sumBest(roundScoresByNumber(4), ROUND_PICK_COUNTS[4]) : Number.POSITIVE_INFINITY;

    const safe = (n: number) => (Number.isFinite(n) ? n : 0);
    const total = safe(round1) + safe(round2) + safe(round3) + safe(round4);

    const tiebreakerDelta =
      winnerStrokes != null && entry.tiebreakerWinnerStrokes != null
        ? Math.abs(entry.tiebreakerWinnerStrokes - winnerStrokes)
        : null;

    return {
      entryId: entry.entryId,
      round1: safe(round1),
      round2: safe(round2),
      round3: cutQualified ? safe(round3) : null,
      round4: cutQualified ? safe(round4) : null,
      total,
      cutQualified,
      tiebreakerDelta,
    };
  });
}

