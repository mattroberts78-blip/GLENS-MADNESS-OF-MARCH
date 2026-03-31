'use client';

import { useState } from 'react';
import { PaymentTable } from '@/components/PaymentTable';
import { TeamsAdmin } from '@/components/TeamsAdmin';
import { AdminResultsBracket } from '@/components/AdminResultsBracket';
import { LockBracketsAdmin } from '@/components/LockBracketsAdmin';
import { BracketsAdmin } from '@/components/BracketsAdmin';
import { GolfAdminPanel } from '@/components/GolfAdminPanel';

type Participant = {
  id: number;
  username: string;
  payment_verified_at: string | null;
  entry_count: string;
};

type TeamRow = {
  region: string;
  seed: number;
  name: string | null;
};

type EntryRow = {
  id: number;
  name: string | null;
  locked_at: string | null;
  username: string;
  picks_complete: boolean | null;
};

type SectionKey = 'participants' | 'brackets' | 'lock' | 'teams' | 'results' | 'golf';

export function AdminDashboardShell({
  username,
  adminToken,
  participants,
  entries,
  teams,
  dbError,
  golfEvents,
  contest,
}: {
  username: string;
  adminToken: string;
  participants: Participant[];
  entries: EntryRow[];
  teams: TeamRow[];
  dbError: string | null;
  golfEvents: { id: number; name: string }[];
  contest: 'basketball' | 'golf';
}) {
  const [section, setSection] = useState<SectionKey>(contest === 'golf' ? 'golf' : 'participants');

  const renderContent = () => {
    switch (section) {
      case 'participants':
        if (contest !== 'basketball') return null;
        return (
          <section className="card">
            <h2 className="card-title">Participants</h2>
            {dbError ? (
              <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Database error: {dbError}
              </p>
            ) : (
              <PaymentTable participants={participants} adminToken={adminToken} />
            )}
          </section>
        );
      case 'lock':
        if (contest !== 'basketball') return null;
        return (
          <section className="card">
            <h2 className="card-title">Lock brackets</h2>
            <LockBracketsAdmin adminToken={adminToken} />
          </section>
        );
      case 'brackets':
        if (contest !== 'basketball') return null;
        return (
          <section className="card">
            <h2 className="card-title">Brackets</h2>
            <p className="page-subtitle">
              View and delete individual brackets for any participant.
            </p>
            <BracketsAdmin entries={entries} adminToken={adminToken} />
          </section>
        );
      case 'teams':
        if (contest !== 'basketball') return null;
        return (
          <section className="card">
            <h2 className="card-title">Tournament teams</h2>
            <p className="page-subtitle">
              Set the team names for each seed and region in the current contest. This updates the{' '}
              <code>teams</code> table in Neon.
            </p>
            <TeamsAdmin adminToken={adminToken} initialTeams={teams} />
          </section>
        );
      case 'golf':
        if (contest !== 'golf') return null;
        return (
          <section className="card">
            <h2 className="card-title">Golf pick'em</h2>
            <p className="page-subtitle">Create golf events, assign 9 tiers, and upload round scoring.</p>
            <GolfAdminPanel adminToken={adminToken} events={golfEvents} />
          </section>
        );
      case 'results':
        if (contest !== 'basketball') return null;
      default:
        return (
          <section className="card">
            <h2 className="card-title">Game results (scoring)</h2>
            <p className="page-subtitle">
              Click the winner of each game. Same layout as the participant bracket — fill Round of
              64 first, then later rounds unlock. Results save automatically and drive the
              scoreboard.
            </p>
            <AdminResultsBracket adminToken={adminToken} teams={teams} />
          </section>
        );
    }
  };

  const navButton = (key: SectionKey, label: string) => (
    <button
      type="button"
      onClick={() => setSection(key)}
      className="btn"
      style={{
        width: '100%',
        justifyContent: 'flex-start',
        padding: '0.5rem 0.75rem',
        marginBottom: '0.5rem',
        background: section === key ? 'var(--accent-soft)' : 'transparent',
        color: section === key ? 'var(--accent-hover)' : 'var(--text-muted)',
        border: 'none',
        fontSize: '0.9rem',
      }}
    >
      {label}
    </button>
  );

  return (
    <main className="page-container" style={{ maxWidth: 1100 }}>
      <h1 className="page-title">Admin</h1>
      <p className="page-subtitle">
        {contest === 'golf' ? "Golf Pick'em" : "Glen's Madness of March"} - Logged in as <strong>{username}</strong>.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(160px, 220px) minmax(0, 1fr)',
          gap: '1.25rem',
          alignItems: 'flex-start',
        }}
      >
        <aside
          className="card"
          style={{
            padding: '0.75rem',
          }}
        >
          <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
            Admin menu
          </h2>
          {contest === 'basketball' ? (
            <>
              {navButton('participants', 'Participants')}
              {navButton('brackets', 'Brackets')}
              {navButton('lock', 'Lock / unlock')}
              {navButton('teams', 'Tournament teams')}
              {navButton('results', 'Game results')}
            </>
          ) : (
            <>{navButton('golf', 'Golf pick\'em')}</>
          )}
        </aside>

        <div>{renderContent()}</div>
      </div>
    </main>
  );
}

