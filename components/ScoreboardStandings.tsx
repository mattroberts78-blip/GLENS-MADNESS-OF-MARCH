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
  roundsWithResults,
  leaderScore,
  prevRankMap,
  finishMap,
}: {
  rows: StandingsRow[];
  roundsWithResults: number[];
  leaderScore: number;
  prevRankMap: PrevRankMap;
  finishMap: FinishMap;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.displayName.toLowerCase().includes(q));
  }, [rows, query]);

  const modalRows = showAll ? filteredRows : filteredRows.slice(0, 10);
  const rankMap = useMemo(() => new Map(rows.map((r, i) => [r.entry_id, i + 1])), [rows]);

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
            <td className="sb-name-cell" style={tdStyle}>
              <span className="sb-name-text">{r.displayName}</span>
              {eliminated && <span className="sb-badge-elim">Eliminated</span>}
            </td>
            <td style={{ ...tdRight, fontWeight: 700 }}>{r.score}</td>
            {roundsWithResults.map((rnd) => (
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <p className="page-subtitle" style={{ margin: 0, fontSize: "0.78rem" }}>
            Showing top 10 brackets. Open modal to search or expand.
          </p>
          <button
            type="button"
            className="nav-link"
            onClick={() => setModalOpen(true)}
            style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.35rem 0.6rem", background: "transparent" }}
          >
            Open standings modal
          </button>
        </div>
      </section>

      <section className="card" style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "center", width: 28 }} title="Rank change">&nbsp;</th>
              <th style={{ ...thStyle, textAlign: "center", width: 28 }}>#</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Bracket</th>
              <th style={thStyle}>Pts</th>
              {roundsWithResults.map((rnd) => (
                <th key={rnd} className="sb-hide-mobile" style={{ ...thStyle, fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  R{rnd}
                </th>
              ))}
              <th style={thStyle}>Max</th>
              <th style={thStyle}>Rem</th>
              <th style={thStyle}>Risk%</th>
              <th className="sb-hide-mobile" style={{ ...thStyle, fontSize: "0.75rem" }}>Range</th>
            </tr>
          </thead>
          <tbody>{renderRows(rows.slice(0, 10))}</tbody>
        </table>
      </section>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(1200px, 96vw)", maxHeight: "90vh", overflow: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <strong>Standings Explorer</strong>
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
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => setModalOpen(false)}
                  style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.35rem 0.6rem", background: "transparent" }}
                >
                  Close
                </button>
              </div>
            </div>
            <p className="page-subtitle" style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "0.78rem" }}>
              Showing {modalRows.length} of {filteredRows.length} matching brackets
              {!showAll && filteredRows.length > 10 ? " (top 10 by current sort)" : ""}.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "center", width: 28 }} title="Rank change">&nbsp;</th>
                  <th style={{ ...thStyle, textAlign: "center", width: 28 }}>#</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Bracket</th>
                  <th style={thStyle}>Pts</th>
                  {roundsWithResults.map((rnd) => (
                    <th key={rnd} className="sb-hide-mobile" style={{ ...thStyle, fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      R{rnd}
                    </th>
                  ))}
                  <th style={thStyle}>Max</th>
                  <th style={thStyle}>Rem</th>
                  <th style={thStyle}>Risk%</th>
                  <th className="sb-hide-mobile" style={{ ...thStyle, fontSize: "0.75rem" }}>Range</th>
                </tr>
              </thead>
              <tbody>
                {modalRows.length > 0 ? (
                  renderRows(modalRows)
                ) : (
                  <tr>
                    <td colSpan={8 + roundsWithResults.length} style={{ ...tdStyle, textAlign: "center", color: "var(--text-muted)" }}>
                      No brackets match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

