# System architecture

## Shape

```text
Next.js admin UI
  ├─ Dashboard / Pipeline / Agents / Projects
  ├─ Server route handlers
  │    ├─ leads + export + ingestion
  │    ├─ agent job queue
  │    └─ project board
  └─ server-only Supabase client
             │
Postgres / Supabase
  ├─ businesses, audits, contacts, scores
  ├─ projects
  └─ agent_jobs
             │
Orchestrator → Scout / Audit / Demo / Outreach / Project Tracker
```

## Boundaries

- **Web app:** Next.js App Router and TypeScript. Pages remain thin; provider credentials and database reads stay server-side.
- **Lead engine:** deterministic, provider-testable discovery/audit/enrichment orchestration already implemented in `packages/lead-engine`.
- **Scoring:** versioned, configurable calculations in `packages/scoring`.
- **Agent core:** shared types, contract catalog and request validation in `packages/agent-core`.
- **Persistence:** Supabase/Postgres is the source of truth. Views shape read models for the UI.
- **Jobs:** `agent_jobs` is a durable queue boundary. Sprint 1 queues work only; a later worker claims jobs with retries and records outputs.

## Execution rules

1. The orchestrator reads state and proposes the next specialist job.
2. Each job carries explicit JSON input, target IDs and an idempotency key.
3. Specialists write structured output and evidence, not hidden side effects.
4. Demo and outreach end in `needs_review` before any external action.
5. Project Tracker updates progress only from recorded events/evidence.

## Deployment direction

Vercel hosts the Next.js app. Supabase provides Postgres. Durable background workers should be introduced only after synchronous/sample workflows validate quality and cost. This branch does not deploy anything.
