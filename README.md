# Destination Insight Hubs

Tourism data insight platform for Queensland LGAs. IFQ717 Web Development Capstone, built for Localis Technologies Australia.

A web application that lets local government areas, tourism operators, and destination marketing organisations log in and explore region-specific tourism data: occupancy rates, average daily rates, visitor spend, length of stay, and booking windows across Cairns, Gold Coast, Noosa, and the Whitsundays. AI-generated plain-English insights help data-illiterate users understand peaks and troughs.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, JavaScript |
| Backend | Node.js, Express, JavaScript |
| Database | MySQL 8 (Docker locally, Railway in production) |
| DB driver | mysql2 (raw parameterised queries) |
| Validation | Zod |
| Logging | Pino |
| AI agent | Agno + Claude (Sprint 2) |

## Prerequisites

- Node.js >= 20
- npm >= 10
- Docker Desktop (running)
- Git

## Phase 0 quick start

This gets you from clone to a working `GET /api/health` returning `{"status":"ok","db":"connected"}` in under 20 minutes.

```bash
# 1. Clone and enter the repo
git clone <your-repo-url>
cd destination-insight-hubs

# 2. Install all workspace dependencies (root, client, server)
npm install

# 3. Create the server env file from the example
#    Windows CMD:  copy server\.env.example server\.env
#    macOS/Linux:  cp server/.env.example server/.env

# 4. Start MySQL 8 in Docker and wait for it to report healthy
npm run db:up

# 5. Start both client and server together
npm run dev
```

Then verify:

```bash
curl http://localhost:4000/api/health
# Expected: {"status":"ok","db":"connected"}
```

| Service | URL |
|---|---|
| Client (Vite) | http://localhost:5173 |
| Server (Express) | http://localhost:4000 |
| MySQL | localhost:3306 |

## Useful scripts

| Command | Effect |
|---|---|
| `npm run dev` | Run client + server concurrently |
| `npm run dev:server` | Server only |
| `npm run dev:client` | Client only |
| `npm run db:up` | Start MySQL container |
| `npm run db:down` | Stop MySQL container |
| `npm run db:reset` | Wipe volume and recreate MySQL |
| `npm run db:logs` | Tail MySQL logs |
| `npm run lint` | Lint client + server |

## Repository layout

```
destination-insight-hubs/
├── client/                 React 18 + Vite frontend
│   └── src/
│       ├── api/            Fetch wrapper, API calls
│       ├── components/     Reusable UI
│       └── pages/          Route-level views
├── server/                 Node.js + Express API
│   └── src/
│       ├── config/         Env loading and validation
│       ├── db/             MySQL pool + init SQL
│       ├── middleware/     Error envelope, request logging
│       ├── routes/         HTTP layer (Zod validation)
│       ├── services/       Business logic (transport-agnostic)
│       ├── repositories/   MySQL access (parameterised queries)
│       └── utils/          Logger, helpers
├── docs/                   Living documentation
│   └── decisions/          Architecture Decision Records
├── docker-compose.yml      Local MySQL 8
└── package.json            npm workspaces root
```

## Architecture

The server uses a strict three-layer pattern:

```
Routes (HTTP only — validate with Zod, call service, return JSON)
  → Services (business logic — no HTTP knowledge)
    → Repositories (MySQL access only — parameterised queries)
```

This keeps services transport-agnostic so the Sprint 2 Agno agent can call the same service functions as the REST API without duplication.

## Documentation

See `docs/` for setup notes, the test plan, and Architecture Decision Records in `docs/decisions/`.
