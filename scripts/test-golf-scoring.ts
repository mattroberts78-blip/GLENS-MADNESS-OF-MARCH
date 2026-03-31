import assert from 'node:assert/strict';
import { scoreGolfEntries, type GolfRoundScore } from '@/lib/golf/scoring';
import { computeEntryScore } from '@/lib/scoring';

function runGolfScoringTests() {
  const rounds: GolfRoundScore[] = [
    { golferId: 1, round: 1, strokes: 70, madeCut: true },
    { golferId: 2, round: 1, strokes: 71, madeCut: true },
    { golferId: 3, round: 1, strokes: 72, madeCut: true },
    { golferId: 4, round: 1, strokes: 73, madeCut: true },
    { golferId: 5, round: 1, strokes: 74, madeCut: true },
    { golferId: 6, round: 1, strokes: 75, madeCut: true },
    { golferId: 7, round: 1, strokes: 76, madeCut: true },
    { golferId: 8, round: 1, strokes: 77, madeCut: true },
    { golferId: 9, round: 1, strokes: 78, madeCut: false },
    { golferId: 1, round: 2, strokes: 70, madeCut: true },
    { golferId: 2, round: 2, strokes: 71, madeCut: true },
    { golferId: 3, round: 2, strokes: 72, madeCut: true },
    { golferId: 4, round: 2, strokes: 73, madeCut: true },
    { golferId: 5, round: 2, strokes: 74, madeCut: true },
    { golferId: 6, round: 2, strokes: 75, madeCut: true },
    { golferId: 1, round: 3, strokes: 70, madeCut: true },
    { golferId: 2, round: 3, strokes: 71, madeCut: true },
    { golferId: 3, round: 3, strokes: 72, madeCut: true },
    { golferId: 4, round: 3, strokes: 73, madeCut: true },
    { golferId: 1, round: 4, strokes: 70, madeCut: true },
    { golferId: 2, round: 4, strokes: 71, madeCut: true },
    { golferId: 3, round: 4, strokes: 72, madeCut: true },
    { golferId: 4, round: 4, strokes: 73, madeCut: true },
  ];

  const [result] = scoreGolfEntries(
    [{ entryId: 10, tiebreakerWinnerStrokes: 274, picks: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
    rounds,
    272
  );

  assert.equal(result.round1, 435);
  assert.equal(result.round2, 360);
  assert.equal(result.round3, 286);
  assert.equal(result.round4, 286);
  assert.equal(result.total, 1367);
  assert.equal(result.cutQualified, true);
  assert.equal(result.tiebreakerDelta, 2);
}

function runBasketballRegressionSmokeTest() {
  const score = computeEntryScore({ 'r1-1': 0 }, { 'r1-1': 0 });
  assert.equal(typeof score, 'number');
}

runGolfScoringTests();
runBasketballRegressionSmokeTest();
console.log('Golf scoring + basketball smoke tests passed.');
