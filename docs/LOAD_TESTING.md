# Load testing

Simulate ~100 users logging in and making bracket picks (e.g. when teams are populated and everyone submits at once).

## 1. Install k6

- **Windows (scoop):** `scoop install k6`
- **macOS:** `brew install k6`
- **Linux:** see [k6 installation](https://k6.io/docs/getting-started/installation/)

## 2. Seed load-test users

From the project root, create 120 test users (each with one bracket entry) and write `load-test-users.json`:

```bash
npm run load-test:seed
# or with a custom count:
npx tsx scripts/seed-load-test-users.ts 150
```

Credentials: `loadtest001` … `loadtest120`, password `loadtest`. **Do not use in production.**

## 3. Run the app

Start the app so k6 can hit it (local or deployed):

```bash
npm run build && npm run start
# or for local dev: npm run dev
```

## 4. Run the load test

Default: ramp to 100 virtual users over 1 minute, hold 2 minutes, then ramp down.

```bash
npm run load-test
```

Test a deployed URL:

```bash
k6 run -e BASE_URL=https://your-app.vercel.app load-test/k6.js
```

Custom VUs and duration:

```bash
k6 run --vus 100 --duration 5m load-test/k6.js
```

## What the script does

Each virtual user (VU):

1. Logs in via `POST /api/auth/login` (form).
2. Gets home page `GET /`.
3. Gets bracket page `GET /brackets/:id`.
4. Saves picks `POST /api/entries/:id/picks` (full 63-game bracket + tiebreaker).
5. Sleeps 1–3 seconds, then repeats.

Thresholds (in `load-test/k6.js`):

- &lt; 5% of requests may fail.
- 95th percentile response time &lt; 3 s.

Adjust `options` and `thresholds` in `load-test/k6.js` as needed.
