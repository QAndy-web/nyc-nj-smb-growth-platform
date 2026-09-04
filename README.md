# NYC + NJ SMB Growth Platform

Phase 1 is a working lead engine for finding strong NYC and New Jersey local businesses with weak digital presence. The current increment preserves that engine and adds an ontology/context layer: raw Observations are separated from canonical Facts, Company is separated from Opportunity, qualification is separated from sales stage, and Agents operate through registered actions rather than owning workflow state.

Automated outreach, payments, autonomous demo publishing, client-site deployment, SEO execution, and recurring maintenance are intentionally outside this phase. Outreach remains draft-only and human-approved.

## What is included

- Configurable NYC boroughs and 15 initial NJ cities
- Configurable target categories and revenue-potential bands
- Google Places Text Search (New) adapter with grid scanning, pagination, throttling, retries, and exponential backoff
- Idempotent `google_place_id` upserts
- Website reachability, mobile viewport, and conversion-CTA checks
- Public email extraction from the official homepage/contact/about pages only
- Source URL and extraction method retained for every discovered email
- Business Quality, Digital Weakness, Revenue Potential, Opportunity Score, and S/A/B/C tiers
- Persisted lead dashboard with every Phase 1 filter and CSV export
- Unit tests for scoring, parsing, retry behavior, website audits, and provider-independent ingestion
- Durable lead pipeline stages, delivery projects, and idempotent agent jobs
- One Orchestrator plus Scout, Audit, Demo Generator, Outreach Drafter, and Project Tracker contracts
- Observation/Fact lineage plus explicit Company, Website, Contact, AuditFinding, Opportunity, Approval, DomainEvent and AuditLog records
- A shared state-machine and Agent permission boundary in `packages/ontology`
- Explainable Fit, Need, Reachability, Value and Confidence components while retaining the existing Opportunity Score
- Project-scoped execution guidance for bounded planning, architecture review, checkpoint reporting, verification, and retry limits

## Prerequisites

- Node.js 20+
- pnpm 10+
- A Supabase project (or compatible Postgres database exposed through Supabase)
- A Google Cloud project with Places API (New) enabled

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template and fill in server credentials:

   ```bash
   cp .env.example apps/web/.env.local
   ```

   `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it through a `NEXT_PUBLIC_` variable or commit `.env.local`.

3. Apply all migrations in filename order through `202609040002_ontology_state_layer.sql`. With a linked Supabase CLI project:

   ```bash
   supabase db push
   ```

   You can also paste the migration into the Supabase SQL editor for a new project.

4. Start the dashboard:

   ```bash
   pnpm dev
   ```

5. Open the dashboard, choose a territory and category, and run a one-cell sample scan. Expand `maxCells` and `maxPagesPerCell` through the ingestion API only after validating API cost and output quality.

## Ingestion API

`POST /api/ingestion`

```json
{
  "territoryId": "jersey-city",
  "categoryId": "dentists",
  "maxCells": 1,
  "maxPagesPerCell": 1
}
```

The endpoint validates configuration, creates an ingestion run, searches cells sequentially, deduplicates places in memory and in Postgres, audits each listed website, scans official public pages for contacts, and writes the current score. The dashboard intentionally starts with the smallest scan to control Google API usage.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Re-audit existing lead data

After applying `202609040001_reaudit_existing_leads.sql`, historical contacts and scores are retained but hidden from qualification until each business is re-audited with the hardened fetch/parser path. Preview the next bounded batch, then explicitly apply it:

```bash
pnpm reaudit:leads -- --limit 25
pnpm reaudit:leads -- --apply --limit 25
```

The command never discovers new businesses or sends outreach. Failed businesses remain marked `needs_reaudit`, so the batch is safe to retry after correcting the underlying transport or site issue.

## Architecture

- `apps/web`: Next.js admin UI and server-only API routes
- `packages/lead-engine`: provider adapters, territory/category configuration, website audit, public-contact enrichment, and ingestion orchestration
- `packages/scoring`: configurable scoring rules and tier thresholds
- `packages/ontology`: authoritative business states, legal transitions, domain events and Agent action permissions
- `supabase/migrations`: explicit relational schema, indexes, RLS, and the dashboard view

See [Phase 1 architecture](docs/phase-1-architecture.md) for data flow, provider behavior, and known limits.

Growth OS planning documents:

- [MVP PRD](docs/mvp-prd.md)
- [System architecture](docs/system-architecture.md)
- [Database schema](docs/database-schema.md)
- [Page structure](docs/page-structure.md)
- [Agent contracts](docs/agent-contracts.md)
- [Sprint 1 backlog](docs/sprint-1-backlog.md)
- [Project skills and security review](.agents/skills/README.md)
- [Industry pilot and calibration plan](docs/industry-pilot-plan.md)
- [Product roadmap, MVP acceptance, and early revenue](docs/product-roadmap.md)

## Ontology migration safety

The ontology migration is additive: it does not drop, rename or truncate legacy Lead Engine data. It backfills evidence and opportunity read models while preserving `businesses.pipeline_*`, `contact_sources` and `business_scores.opportunity_score` as compatibility fields. Validate the migration first on a non-production database and compare row counts plus sampled evidence lineage before enabling any future transition worker.

Operational rollback means switching readers/writers back to the legacy compatibility fields while retaining the additive tables for diagnosis. Do not delete the new or old records as a rollback shortcut.
