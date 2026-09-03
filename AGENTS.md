# AGENTS.md

## Mission
Build the NYC + NJ SMB Website Growth Platform as a production-quality system that discovers strong local businesses with weak digital presence, audits their websites, enriches public business contact data, scores opportunities, generates demo sites, supports outreach/CRM, and ultimately supports website production plus recurring maintenance/SEO services.

## Product principles
- Optimize for real SMB lead quality, not raw lead count.
- Prefer businesses with strong operating signals and weak digital presence.
- Use only publicly listed business contact information. Never fabricate or guess private/personal email addresses.
- Never commit secrets or API keys. Use environment variables and `.env.example`.
- Keep modules independently testable and observable.
- Preserve provider terms and rate limits. Add retries/backoff and idempotent ingestion.

## Current phase: Phase 1 Lead Engine + Sprint 1 Growth OS foundation
Implement the following production-ready foundation:
1. Monorepo app foundation using the existing pnpm/Turborepo structure.
2. Supabase/Postgres schema for businesses, scans, website audits, contact sources, scores, and ingestion runs.
3. Google Places ingestion for NYC + New Jersey using geographic-grid × business-category discovery.
4. Deduplicate using Google `place_id` as the canonical external ID.
5. Website existence/reachability checks and website-status classification.
6. Public business email/contact discovery from official public pages only, with source URLs and confidence/status.
7. Scoring engine for Business Quality, Digital Weakness, Revenue Potential, Opportunity Score, and S/A/B/C tiers.
8. Admin dashboard backed by real persisted data with filters for territory, category, website status, tier, opportunity score, rating, review count, and email availability.
9. CSV export.
10. Tests, validation, logs, error handling, and developer documentation.
11. Preserve the Lead Engine while adding dashboard, pipeline-stage, agent-job and project-tracking foundations.
12. Agent execution must use one orchestrator plus explicit specialist contracts; demo sharing, outreach sending and production launch require human approval.

## Geographic scope
NYC: Manhattan, Brooklyn, Queens, Bronx, Staten Island.
NJ initial priority: Jersey City, Hoboken, Newark, Fort Lee, Edgewater, Englewood, Hackensack, Paramus, Montclair, Clifton, Elizabeth, Edison, New Brunswick, Secaucus, Weehawken. Architecture must support adding more territories without code duplication.

## Initial target categories
Dentists, med spas, lawyers, accountants, HVAC, plumbers, electricians, contractors, movers, cleaners, auto repair, salons, barbers, nail salons, restaurants, pet groomers, photographers, tutors/training businesses. Categories must be configurable.

## Quality bar
- Type-safe TypeScript wherever practical.
- Idempotent ingestion and DB upserts.
- Explicit schemas and migrations.
- Unit tests for scoring and parsing logic.
- Integration-testable provider adapters.
- Clear errors for missing env vars.
- No hidden magic constants; scoring weights should be configurable.
- Do not build outreach sending yet; Phase 1 ends at a usable qualified-lead dashboard/export.

## Working style
Before major changes, inspect the repository and existing code. Prefer small coherent commits. When implementing a task, update docs if architecture or setup changes. Do not remove existing work unless required. If an assumption is uncertain, choose the safest extensible implementation and document it.
