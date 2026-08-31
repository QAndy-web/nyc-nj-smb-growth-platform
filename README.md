# NYC + NJ SMB Growth Platform

Phase 1 is a working lead engine for finding strong NYC and New Jersey local businesses with weak digital presence. It scans configured market cells with Google Places, persists canonical businesses in Supabase/Postgres, audits listed websites, discovers public business emails from official pages, scores the opportunity, and exposes the result in a filterable admin dashboard with CSV export.

Automated outreach, payments, demo-site generation, client websites, SEO execution, and recurring maintenance are intentionally outside this phase.

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

3. Apply `supabase/migrations/202608310001_phase1_lead_engine.sql`. With a linked Supabase CLI project:

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

## Architecture

- `apps/web`: Next.js admin UI and server-only API routes
- `packages/lead-engine`: provider adapters, territory/category configuration, website audit, public-contact enrichment, and ingestion orchestration
- `packages/scoring`: configurable scoring rules and tier thresholds
- `supabase/migrations`: explicit relational schema, indexes, RLS, and the dashboard view

See [Phase 1 architecture](docs/phase-1-architecture.md) for data flow, provider behavior, and known limits.
