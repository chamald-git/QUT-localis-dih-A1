# Assumptions and Scope Decisions

Documented scope decisions and assumptions for the Destination Insight Hubs project.

## In scope

- Four Queensland LGAs: Cairns, Gold Coast, Noosa, Whitsundays
- Three supplied Localis CSV datasets (occupancy/ADR, length-of-stay, spend)
- Three user roles: Admin, Government, Operator/DMO
- Two dataset tiers: spend-only, full (occupancy + spend)
- JWT-based authentication (no OAuth in scope)
- Desktop-first responsive layout (mobile not a primary target)

## Out of scope (for A1/A2 submission)

- Live data streaming or real-time updates
- CSV upload via the UI (seed script only — DIH-2 is region *selection*, not live upload)
- Payment or subscription management
- Map GPS point data — choropleth over LGA boundaries only (GPS data not supplied)
- More than four regions (extensible architecture but not built for Sprint 1/2)

## Key assumptions

- Spend figures are Visa-sourced card transaction data representing approximately 50–60% of Australian card spend
- The "Whitsunday" / "Whitsundays" naming inconsistency across CSVs is normalised to "Whitsundays" at seed time
- Date formats differ between files (ISO 8601 vs DD/MM/YYYY) — normalised to ISO 8601 at seed time
- Story 7 (charts that update with filters) is merged with Story 5 (visualisation) as they describe the same feature — both covered by DIH-5
- Demo accounts seeded in MySQL for marking: admin@demo.com, operator@demo.com, gov@demo.com
