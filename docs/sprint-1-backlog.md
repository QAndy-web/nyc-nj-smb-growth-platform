# Sprint 1 backlog — Platform foundation

## Goal

Preserve the completed Phase 1 Lead Engine and add the smallest coherent operating shell for pipeline, agent work and client delivery.

## Completed before this continuation

- [x] NYC/NJ territory and category configuration.
- [x] Google Places provider, dedupe/upsert and bounded ingestion.
- [x] Website reachability/basic weakness audit.
- [x] Public business-email enrichment with source URLs.
- [x] Opportunity scoring, filters, CSV export and tests.

## This continuation

- [x] Confirm dedicated repository, Issue #1 and open feature branch/PR.
- [x] Write compact PRD, architecture, schema, page map and agent contracts.
- [x] Add persistent lead stage, project and agent-job models.
- [x] Add dashboard shell and primary navigation.
- [x] Move lead operations into a Pipeline page with stage visibility/filtering.
- [x] Add Project Tracker read surface and project API.
- [x] Add Orchestrator + specialist catalog and queue API skeleton.
- [x] Add contract validation tests.
- [ ] Apply both migrations to a configured Supabase environment.
- [ ] Run one real one-cell Places ingestion and verify persisted output.
- [ ] Manually review the top leads before increasing scan size.

## Definition of done

Local lint, typecheck, tests and production build pass; docs and migration agree with code; the branch remains reviewable and undeployed.
