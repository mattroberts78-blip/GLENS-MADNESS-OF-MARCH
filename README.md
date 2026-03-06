# Glens Madness

NCAA March Madness bracket contest — web app for running a local pool with round×seed scoring.

## Stack

- **Next.js 14** (App Router) — runs on Vercel
- **Vercel Postgres** — add a Postgres database via [Vercel Marketplace](https://vercel.com/marketplace?category=storage&search=postgres) (e.g. Neon). `POSTGRES_URL` is injected automatically when deployed.

## Setup

1. **Clone and install**
   ```bash
   cd GLENS_MADNESS
   npm install
   ```

2. **Database**
   - In the [Vercel dashboard](https://vercel.com), open your project → Storage / Integrations → add a Postgres provider (e.g. Neon).
   - Locally: copy `env.example` to `.env.local` and set `POSTGRES_URL` (from Vercel env or your own Postgres).
   - Apply schema: `npm run db:push`

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm run start` — production
- `npm run db:push` — apply `lib/db/schema.sql` to the database

## Product (V1)

- **Participants:** One login per person; fill out bracket(s) in the app; view brackets and live scoreboard (current points + max remaining per entry). Tiebreaker: predicted total points in the championship game.
- **Admin:** Pre-configured username/password pairs; “next available” credential to email after payment; manual entry of teams and game results; bracket lock before first game.
