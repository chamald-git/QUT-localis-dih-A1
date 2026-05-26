# Test Plan

Manual test cases recorded per the Definition of Done (item 3: at least one
manual test case per feature). Automated tests are added alongside features as
they land.

## Phase 0 — Environment scaffold

| ID | Case | Steps | Expected | Result |
|---|---|---|---|---|
| P0-1 | Health endpoint, DB up | `npm run db:up`, wait for healthy, `npm run dev:server`, GET `http://localhost:4000/api/health` | `200` with body `{"status":"ok","db":"connected"}` | |
| P0-2 | Health endpoint, DB down | Stop MySQL (`npm run db:down`), GET `/api/health` | `503` with body `{"status":"degraded","db":"disconnected"}` | |
| P0-3 | Unknown route envelope | GET `/api/does-not-exist` | `404` with `{ "error": { "code": "NOT_FOUND", ... } }` | |
| P0-4 | Client connectivity | `npm run dev`, open `http://localhost:5173` | Page shows "All systems connected" with status `ok`, db `connected` | |
| P0-5 | Bad env fails fast | Set `DATABASE_URL` to a non-URL value, start server | Process exits with a readable validation error | |
