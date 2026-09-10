# System architecture

## Shape

```text
Next.js operating UI
  ├─ Dashboard: business state, approvals and pipeline
  ├─ Pipeline: Company → Opportunity qualification → Sales stage
  ├─ Agents: execution jobs and permission boundaries
  └─ Projects: won work and delivery state
             │
Context / ontology layer (@growth/ontology + Postgres)
  ├─ Observation → resolver → canonical Fact
  ├─ Company ─ Website ─ Contact
  ├─ WebsiteAudit ─ AuditFinding
  ├─ Opportunity (qualification state + independent sales stage)
  ├─ Approval
  └─ DomainEvent + AuditLog
             │
Agent action contracts
  └─ Orchestrator → Scout / Audit / Demo / Outreach Draft / Project Tracker
             │
Provider adapters and existing Lead Engine
```

## Source-of-truth boundaries

- **Provider adapters** return raw public observations. A crawler result is never canonical by itself.
- **Observations** preserve the raw payload, source, fingerprint, confidence, actor and timestamp.
- **Resolvers** promote evidence-linked candidates into `facts`; each accepted fact has one observation lineage.
- **Company** is the domain name for the existing `businesses` storage record. The `companies` view provides the new vocabulary without renaming or deleting the legacy table.
- **Website and Contact** have explicit verification state. Existing `website_audits` and `contact_sources` remain history/compatibility records.
- **Opportunity** is separate from Company. Qualification (`unassessed → screening → qualified/disqualified`) is separate from sales (`not_started → outreach_ready → … → won/lost`).
- **Approval** is a first-class record. Demo sharing, outreach sending and client launch are human-only actions.
- **Domain events** are append-only orchestration signals. `company.verified`, `website.verified`, `audit.completed`, `opportunity.qualified` and `contact.verified` are registered event types.
- **Audit logs** capture creates and state changes with before/after state, evidence IDs, actor, timestamp and rollback data.

## State-driven execution

1. Scout or a provider adapter records an Observation.
2. A deterministic resolver links the evidence to an existing Company or creates one using the Google Place identity boundary.
3. The resolver promotes individual Facts; an observed website remains a candidate until audit evidence verifies it.
4. Website Audit and Contact discovery append evidence and emit events.
5. Scoring creates or refreshes an Opportunity candidate. It does not qualify it automatically.
6. The Orchestrator may request only an action registered in `@growth/ontology`. Canonical state actions require evidence and a legal before/after transition.
7. Human-only actions require an Approval object and cannot be executed by an Agent action.
8. Every state write retains audit history; downstream orchestration reacts to Domain Events rather than hidden Agent memory.

## Compatibility and rollback

Migration `202609040002_ontology_state_layer.sql` is additive. It preserves all old tables, rows and columns, adds new objects, and backfills observations/facts/opportunities from existing records. `business_scores.opportunity_score` and `businesses.pipeline_*` remain readable and appear in `lead_dashboard`.

Rollback is consumer-first: stop writing new action fields, switch UI/API readers back to the legacy columns, and leave the additive tables in place for investigation. Do not drop new tables or legacy data as an operational rollback. A later migration can retire compatibility columns only after production parity and an explicit data-retention decision.

## Current boundary

This increment provides the state model, persistence, action validation, events and read models. It does not add an autonomous worker, automatic qualification, outreach sending, demo sharing, production launch or deployment.
