# Database schema

## Core records

| Table / view | Purpose | Identity / safety rule |
| --- | --- | --- |
| `businesses` | Canonical lead plus sales stage | Unique `google_place_id`; additive stage fields |
| `ingestion_runs` | Scan history and errors | One row per bounded run |
| `website_audits` | Historical website evidence | Append-only per check |
| `contact_sources` | Public business email provenance | Unique business + email + source URL |
| `business_scores` | Current component and opportunity scores | One current versioned score per business |
| `projects` | Won-client delivery state | References a business; progress 0–100 |
| `agent_jobs` | Durable specialist work requests/results | Unique idempotency key; explicit status |
| `lead_dashboard` | Pipeline read model | Latest audit/contact plus score and stage |
| `project_board` | Project Tracker read model | Project joined to business identity |

## Pipeline stages

`discovered → qualified → audit_ready → demo_ready → outreach_draft → contacted → replied → meeting → proposal → won/lost`

## Project stages

`discovery → audit → demo → sales → onboarding → build → client_review → launch → maintenance`

## Agent job lifecycle

`queued → running → needs_review/succeeded` with `failed` and `cancelled` terminal alternatives. Jobs store `input_payload`, `output_payload`, target IDs, retry counters, timestamps and errors. Demo/outreach workers must use `needs_review` before external use.

## Migration order

1. `202608310001_phase1_lead_engine.sql`
2. `202609030001_growth_os_foundation.sql`

All base tables use RLS with no browser policies; server routes use the service-role credential only on the server.
