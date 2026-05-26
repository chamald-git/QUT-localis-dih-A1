# Architecture Decision Records

Short records of the significant technical decisions on this project, in the
lightweight [MADR](https://adr.github.io/) style. Each is numbered and dated.
They exist so the A1/A2 report and any new team member can trace *why* the
architecture looks the way it does, not just *what* it is.

| ADR | Decision | Status |
|---|---|---|
| 0001 | React + Node.js + MySQL core stack | Accepted |
| 0002 | Agno over Google ADK for the AI agent | Accepted |
| 0003 | mysql2 raw queries over Knex/Prisma | Accepted |
| 0004 | GitHub Flow over Git Flow | Accepted |
| 0008 | Three-layer server architecture | Accepted |
| 0009 | Netlify + Railway for hosting | Accepted |

---

## ADR-0001 — React + Node.js + MySQL as the core stack

**Date:** 2026-05 · **Status:** Accepted

**Context.** IFQ717 A2 mandates a Node.js backend and MySQL database. The team
is most familiar with React for the frontend.

**Decision.** React 18 (Vite) on the client, Node.js + Express (JavaScript) on
the server, MySQL 8 for storage.

**Consequences.** Aligns directly with unit requirements, removes a class of
risk at marking time, and matches the team's existing skills. Vite gives fast
local iteration over Create React App.

---

## ADR-0002 — Agno over Google ADK for the AI agent

**Date:** 2026-05 · **Status:** Accepted

**Context.** DIH-14 requires an AI agent that answers plain-language questions
over the seeded tourism data. The client's own pipeline uses Google ADK.

**Decision.** Use Agno with AgentOS, serving the agent as a standard HTTP
endpoint, with Claude as the model.

**Consequences.** AgentOS exposes the agent over plain HTTP with built-in JWT,
RBAC, session scoping, and MySQL storage, so it deploys as a normal Railway
service with no Google Cloud dependency. It still interoperates with the
client's ADK pipeline over HTTP. Adds a Python service to the deployment
topology in Sprint 2.

---

## ADR-0003 — mysql2 raw parameterised queries over Knex/Prisma

**Date:** 2026-05 · **Status:** Accepted

**Context.** The earlier team scaffold used Knex with the mssql driver
(Microsoft SQL Server), which conflicts with the MySQL requirement. We had to
choose a MySQL access approach.

**Decision.** Use the mysql2 driver directly with parameterised queries. No ORM
or query builder.

**Consequences.** Queries are transparent and easy to explain in the report,
there is no ORM abstraction to reason about at marking time, and parameterised
queries cover SQL-injection safety. The cost is writing SQL by hand, which is
acceptable at this project's scale.

---

## ADR-0004 — GitHub Flow over Git Flow

**Date:** 2026-05 · **Status:** Accepted

**Context.** The team needs a branching model that supports reviewed pull
requests (part of the Definition of Done) without heavy ceremony.

**Decision.** GitHub Flow: short-lived feature branches off `main`, merged via
reviewed PR. Branch protection on `main` requires a passing CI check.

**Consequences.** Simple, well understood, and matches the small team size.
Conventional Commits (ADR-0005) link commits to JIRA tickets.

---

## ADR-0008 — Three-layer server architecture

**Date:** 2026-05 · **Status:** Accepted

**Context.** The REST API and the Sprint 2 Agno agent both need to read the
same data. Duplicating query logic across them would be a maintenance and
correctness risk.

**Decision.** Strict separation: routes (HTTP + Zod validation) call services
(business logic, no HTTP knowledge) call repositories (MySQL access only).

**Consequences.** Services are transport-agnostic, so the agent's MySQL tool
calls the same service functions as the REST routes. The health endpoint is
built this way from Phase 0 to set the pattern early.

---

## ADR-0009 — Netlify + Railway for hosting

**Date:** 2026-05 · **Status:** Accepted

**Context.** The deployed app must be reachable for the Definition of Done and
demo, on free tiers suitable for a student project.

**Decision.** Netlify hosts the React frontend (auto-deploy from `main`).
Railway hosts the Express API, a managed MySQL 8 instance, and later the Agno
Python service.

**Consequences.** Both deploy from GitHub with minimal configuration. A single
`DATABASE_URL` injected by Railway matches the config loader, so local and
production differ only by environment variables.
