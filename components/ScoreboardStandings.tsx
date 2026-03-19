"use client";

import { useMemo, useState } from "react";

type StandingsRow = {
  entry_id: number;
  displayName: string;
  score: number;
  maxScore: number;
  remaining: number;
  riskPercentile: number;
  byRound: Record<number, number>;
};

type PrevRankMap = Record<number, number>;
type FinishMap = Record<number, { best: number; worst: number }>;
type SortKey = "points" | "max" | "remaining" | "risk";
type SortDir = "asc" | "desc";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function Arrow({ rank, prevRank }: { rank: number; prevRank?: number }) {
  if (prevRank == null) return <span className="sb-arrow sb-arrow--same">-</span>;
  const diff = prevRank - rank;
  if (diff > 0) return <span className="sb-arrow sb-arrow--up">▲{diff}</span>;
  if (diff < 0) return <span className="sb-arrow sb-arrow--down">▼{Math.abs(diff)}</span>;
  return <span className="sb-arrow sb-arrow--same">-</span>;
}

export function ScoreboardStandings({
  rows,
  roundColumns,
  leaderScore,
  prevRankMap,
  finishMap,
}: {
  rows: StandingsRow[];
  roundColumns: number[];
  leaderScore: number;
  prevRankMap: PrevRankMap;
  finishMap: FinishMap;
}) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedRows = useMemo(() => {
    const clone = [...rows];
    clone.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "max") return (a.maxScore - b.maxScore) * dir;
      if (sortKey === "remaining") return (a.remaining - b.remaining) * dir;
      if (sortKey === "risk") return (a.riskPercentile - b.riskPercentile) * dir;
      return (a.score - b.score) * dir;
    });
    return clone;
  }, [rows, sortDir, sortKey]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedRows;
    return sortedRows.filter((r) => r.displayName.toLowerCase().includes(q));
  }, [sortedRows, query]);

  const visibleRows = showAll ? filteredRows : filteredRows.slice(0, 10);
  const rankMap = useMemo(() => new Map(sortedRows.map((r, i) => [r.entry_id, i + 1])), [sortedRows]);
  const pointsStandingMap = useMemo(() => {
    const byPoints = [...rows].sort((a, b) => b.score - a.score);
    const map = new Map<number, number>();
    byPoints.forEach((r, i) => map.set(r.entry_id, i + 1));
    return map;
  }, [rows]);

  const thStyle = {
    textAlign: "right" as const,
    padding: "0.5rem 0.5rem",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap" as const,
  };
  const tdStyle = {
    padding: "0.4rem 0.5rem",
    borderTop: "1px solid var(--border)",
  };
  const tdRight = { ...tdStyle, textAlign: "right" as const, fontVariantNumeric: "tabular-nums" as const };

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  };

  const sortLabel = (key: SortKey, label: string) =>
    `${label}${sortKey === key ? (sortDir === "desc" ? " ▼" : " ▲") : ""}`;

  const renderRows = (data: StandingsRow[]) => (
    <>
      {data.map((r) => {
        const rank = rankMap.get(r.entry_id) ?? 0;
        const prevRank = prevRankMap[r.entry_id];
        const eliminated = r.maxScore < leaderScore;
        const finish = finishMap[r.entry_id];
        return (
          <tr key={r.entry_id} className={eliminated ? "sb-row-elim" : ""}>
            <td style={{ ...tdStyle, textAlign: "center", width: 28 }}>
              <Arrow rank={rank} prevRank={prevRank} />
            </td>
            <td style={{ ...tdStyle, textAlign: "center", width: 28, fontWeight: 600 }}>{rank}</td>
            <td style={{ ...tdStyle, textAlign: "center", width: 36, fontWeight: 600 }}>
              {pointsStandingMap.get(r.entry_id) ?? rank}
            </td>
            <td className="sb-name-cell" style={tdStyle}>
              <span className="sb-name-text">{r.displayName}</span>
              {eliminated && <span className="sb-badge-elim">Eliminated</span>}
            </td>
            <td style={{ ...tdRight, fontWeight: 700 }}>{r.score}</td>
            {roundColumns.map((rnd) => (
              <td key={rnd} className="sb-hide-mobile" style={{ ...tdRight, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {r.byRound[rnd] ?? 0}
              </td>
            ))}
            <td style={tdRight}>{r.maxScore}</td>
            <td style={tdRight}>{r.remaining}</td>
            <td style={{ ...tdRight, fontWeight: 600 }}>{r.riskPercentile}%</td>
            <td className="sb-hide-mobile" style={{ ...tdRight, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
              {finish ? `${ordinal(finish.best)}-${ordinal(finish.worst)}` : "-"}
            </td>
          </tr>
        );
      })}
    </>
  );

  return (
    <>
      <section className="card" style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bracket name"
            aria-label="Search bracket name"
            style={{
              minWidth: 240,
              background: "var(--panel)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0.45rem 0.6rem",
            }}
          />
          <button
            type="button"
            className="nav-link"
            onClick={() => setShowAll((v) => !v)}
            style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.35rem 0.6rem", background: "transparent" }}
          >
            {showAll ? "Show top 10" : "Show all"}
          </button>
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          <p className="page-subtitle" style={{ margin: 0, fontSize: "0.78rem" }}>
            Showing {visibleRows.length} of {filteredRows.length} matching brackets
            {!showAll && filteredRows.length > 10 ? " (top 10 by current sort)." : "."}
          </p>
        </div>
      </section>

      <section className="card" style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "center", width: 28 }} title="Rank change">&nbsp;</th>
              <th style={{ ...thStyle, textAlign: "center", width: 28 }}>#</th>
              <th style={{ ...thStyle, textAlign: "center", width: 36 }} title="Current standing by points only">Stnd</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Bracket</th>
              <th style={thStyle}>
                <button type="button" className="nav-link nav-link-muted" onClick={() => onSort("points")}>
                  {sortLabel("points", "Pts")}
                </button>
              </th>
              {roundColumns.map((rnd) => (
                <th key={rnd} className="sb-hide-mobile" style={{ ...thStyle, fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  R{rnd}
                </th>
              ))}
              <th style={thStyle}>
                <button type="button" className="nav-link nav-link-muted" onClick={() => onSort("max")}>
                  {sortLabel("max", "Max")}
                </button>
              </th>
              <th style={thStyle}>
                <button type="button" className="nav-link nav-link-muted" onClick={() => onSort("remaining")}>
                  {sortLabel("remaining", "Rem")}
                </button>
              </th>
              <th style={thStyle}>
                <button type="button" className="nav-link nav-link-muted" onClick={() => onSort("risk")}>
                  {sortLabel("risk", "Risk%")}
                </button>
              </th>
              <th className="sb-hide-mobile" style={{ ...thStyle, fontSize: "0.75rem" }}>Range</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length > 0 ? (
              renderRows(visibleRows)
            ) : (
              <tr>
                <td colSpan={9 + roundColumns.length} style={{ ...tdStyle, textAlign: "center", color: "var(--text-muted)" }}>
                  No brackets match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

