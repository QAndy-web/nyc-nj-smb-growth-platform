# Local Business Growth OS — MVP PRD

## Outcome

Give one operator a single system to turn strong NYC/NJ businesses with weak digital presence into qualified, reviewable website-growth opportunities and then track won work through delivery.

## Primary user and job

The first user is the owner/operator, not an external SaaS customer. The daily job is: identify the best next lead, inspect the evidence, approve a tailored demo/outreach draft, and see which client project needs action.

## MVP scope

1. **Dashboard** — system status, funnel focus and next actions.
2. **Lead Pipeline** — existing Places ingestion, website checks, public-contact provenance, scoring, filters and CSV plus a durable sales stage.
3. **Scout** — cost-bounded business discovery and normalization.
4. **Audit** — evidence-backed website, SEO and conversion findings.
5. **Demo Generator** — creates a preview artifact for human review; it never publishes by itself.
6. **Outreach** — drafts personalized messages from approved facts; it never sends by itself.
7. **Project Tracker** — tracks audit through maintenance with progress, blockers and next action.
8. **Orchestrator** — selects specialist jobs from pipeline state, but cannot bypass safety or review gates.

## Non-goals

- Multi-tenant SaaS, billing or client self-service.
- Automatic outreach, proposal acceptance, domain changes or deployment.
- Full-market scans before one-cell cost and lead-quality validation.
- Generating full demo sites for low-probability leads.

## Success criteria

- A lead has one canonical business record, score, public-contact provenance and pipeline stage.
- A retried agent request is idempotent when the caller supplies the same key.
- Audit/demo/outreach outputs remain traceable and reviewable.
- Won work can become a project with stage, progress, blocker and next action.
- Lint, typecheck, tests and production build pass without secrets.

## Business validation

Before deeper automation, manually review the top 100 opportunities and test whether an audit/demo improves reply and meeting rates. Track qualified-lead rate, email-found rate, contact-to-reply, reply-to-meeting, meeting-to-close, setup revenue, MRR and delivery time.
