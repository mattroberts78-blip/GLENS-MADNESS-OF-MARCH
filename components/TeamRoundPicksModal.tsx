"use client";

import { useMemo, useState } from "react";

type TeamRoundRow = {
  team: string;
  counts: Record<number, number>;
};

export function TeamRoundPicksModal({
  rows,
  rounds,
  totalEntries,
}: {
  rows: TeamRoundRow[];
  rounds: number[];
  totalEntries: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.team.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <>
      <section className="card" style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <p className="page-subtitle" style={{ margin: 0, fontSize: "0.78rem" }}>
            Team pick counts by round across all brackets.
          </p>
          <button
            type="button"
            className="nav-link"
            onClick={() => setOpen(true)}
            style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.35rem 0.6rem", background: "transparent" }}
          >
            Open Team Round Matrix
          </button>
        </div>
      </section>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
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
              <strong>Team Picks by Round</strong>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search team"
                  aria-label="Search team"
                  style={{
                    minWidth: 220,
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
                  onClick={() => setOpen(false)}
                  style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.35rem 0.6rem", background: "transparent" }}
                >
                  Close
                </button>
              </div>
            </div>

            <p className="page-subtitle" style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "0.78rem" }}>
              Showing {filtered.length} of {rows.length} teams. Counts are number of brackets that picked that team in each round.
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)" }}>
                    Team
                  </th>
                  {rounds.map((r) => (
                    <th
                      key={r}
                      style={{ textAlign: "right", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}
                    >
                      R{r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.team}>
                    <td style={{ padding: "0.5rem 0.75rem", borderTop: "1px solid var(--border)" }}>{row.team}</td>
                    {rounds.map((r) => (
                      <td
                        key={r}
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderTop: "1px solid var(--border)",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                        title={totalEntries > 0 ? `${((row.counts[r] ?? 0) / totalEntries * 100).toFixed(1)}%` : "0%"}
                      >
                        {row.counts[r] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={1 + rounds.length}
                      style={{ padding: "0.6rem 0.75rem", borderTop: "1px solid var(--border)", textAlign: "center", color: "var(--text-muted)" }}
                    >
                      No teams match your search.
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

