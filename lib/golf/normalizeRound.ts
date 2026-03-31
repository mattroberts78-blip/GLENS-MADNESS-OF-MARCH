/** DB drivers sometimes return round_num as string; normalize before comparisons. */
export function normalizeGolfRoundNum(r: unknown): 1 | 2 | 3 | 4 | null {
  const n = Number(r);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return null;
}
