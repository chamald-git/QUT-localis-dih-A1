# AI Insights API — manual test plan (DIH-14)

`GET /api/insights` returns a role-framed plain-English narrative + Vega-Lite charts over the tourism data. This is the manual test plan; it doubles as the testing-evidence section for the report.

## What the endpoint does

`GET /api/insights?regions=&metrics=&period=`

- **role** comes from the **`x-user-role` request header** (the dev `mockUser` stand-in for JWT auth, DIH-1) — *not* a query param. One of `government | dmo | operator | admin`; default `government`.
- **regions** — optional CSV (e.g. `Cairns,Noosa`); blank → all regions.
- **metrics** — optional CSV from `occupancy, adr, length_of_stay, booking_window`; default `occupancy,adr`.
- **period** — `last_30_days | last_60_days | last_90_days` (the most-recent N dates); default `last_90_days`.

**Success** (HTTP 200), wrapped in a `{ data }` envelope:

```json
{
  "data": {
    "role": "government",
    "appliedFilters": {
      "regions": ["Cairns", "Gold Coast", "Noosa", "Whitsundays"],
      "metrics": ["occupancy", "adr"],
      "period": { "preset": "last_90_days", "days": 90, "from": "2024-06-02", "to": "2024-08-30" }
    },
    "narrative": "…2–4 plain-English paragraphs…",
    "charts": [ { "metric": "occupancy", "title": "…", "caption": "…", "chartSpec": { …Vega-Lite v5… }, "data": [ … ] } ]
  }
}
```

`appliedFilters.period.from`/`to` are read off the returned rows (no extra query). **Errors** → `{ "error": { "code", "message" } }`.

> Not in this endpoint yet (tracked in the backlog → Chamal's Jira): input validation / `400`s, JWT auth + role/region/tier authorisation (`401`/`403`, DIH-1), response caching, server-computed KPI cards (DIH-7), and the spend metric.

## Setup

1. **DB** — ensure `DATABASE_URL` (in `server/.env`) points at the seeded MySQL (the team's Railway instance); the tourism tables are already loaded. To (re)load data, run `npm --workspace server run db:seed`.
2. **Server** — `npm --workspace server run dev` → API on `http://localhost:4000`.
3. **Gemini key** — set `GEMINI_API_KEY` in `server/.env` for live narrative + charts. **Without a key (and no cache) the call returns `500`** — there is no fallback in this endpoint (the AI-failure fallback is Sarah's, DIH-70).

## Cases (curl)

Base: `http://localhost:4000`. In Insomnia: one `GET {{baseUrl}}/api/insights` request, add an `x-user-role` header, and vary the query params.

| # | Request | Expect |
|---|---------|--------|
| 1 | `GET /api/insights` (no header, no params) | 200 · `data.role:"government"` · all 4 regions · `metrics:["occupancy","adr"]` · `period.preset:"last_90_days"` (`days:90`, `from`/`to` set) · `narrative` + `charts[]` · **no `kpis`** |
| 2 | header `x-user-role: dmo` / `operator` / `admin` | 200 · `data.role` echoes · narrative framing differs |
| 3 | `?regions=Cairns,Noosa` | 200 · `appliedFilters.regions` = `["Cairns","Noosa"]` · chart rows only those regions |
| 4 | `?metrics=length_of_stay,booking_window&period=last_30_days` | 200 · both LOS metrics present · `period.days:30` |
| 5 | server started **without** `GEMINI_API_KEY` | `500 INTERNAL_ERROR` (no cache fallback) — documented, not asserted |

```bash
# 1 — default
curl -s "http://localhost:4000/api/insights" | jq '.data | {role, appliedFilters, hasKpis: has("kpis")}'

# 2 — role framing (sent via header)
curl -s -H "x-user-role: dmo" "http://localhost:4000/api/insights" | jq '.data.role'

# 3 — region scope
curl -s "http://localhost:4000/api/insights?regions=Cairns,Noosa" | jq '.data.appliedFilters.regions'

# 4 — metrics + period
curl -s "http://localhost:4000/api/insights?metrics=length_of_stay,booking_window&period=last_30_days" | jq '.data.appliedFilters'

# 5 — no key (status only)
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4000/api/insights"
```

## Visual test page

`client/public/insights-test.html` is a standalone harness for the same contract (role dropdown → `x-user-role` header, region/metric/period inputs; renders the narrative, the charts via `vega-embed`, and the raw JSON).

Run `npm run dev` (starts the API + Vite client together), then open **http://localhost:5173/insights-test.html** — its `/api` calls go through the Vite proxy to `:4000`, so no CORS setup is needed.
