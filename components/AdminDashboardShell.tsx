'use client';

import { useState } from 'react';
import { PaymentTable } from '@/components/PaymentTable';
import { TeamsAdmin } from '@/components/TeamsAdmin';
import { AdminResultsBracket } from '@/components/AdminResultsBracket';
import { LockBracketsAdmin } from '@/components/LockBracketsAdmin';

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

type SectionKey = 'participants' | 'lock' | 'teams' | 'results';

export function AdminDashboardShell({
  username,
  adminToken,
  participants,
  teams,
  dbError,
}: {
  username: string;
  adminToken: string;
  participants: Participant[];
  teams: TeamRow[];
  dbError: string | null;
}) {
  const [section, setSection] = useState<SectionKey>('participants');

  const renderContent = () => {
    switch (section) {
      case 'participants':
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
        return (
          <section className="card">
            <h2 className="card-title">Lock brackets</h2>
            <LockBracketsAdmin adminToken={adminToken} />
          </section>
        );
      case 'teams':
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
      case 'results':
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
        Glen&apos;s Madness of March — Logged in as <strong>{username}</strong>.
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
          {navButton('participants', 'Participants')}
          {navButton('lock', 'Lock / unlock')}
          {navButton('teams', 'Tournament teams')}
          {navButton('results', 'Game results')}
        </aside>

        <div>{renderContent()}</div>
      </div>
    </main>
  );
}

