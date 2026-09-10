# Database schema

## Context and business objects

| Table / view | Purpose | Identity / safety rule |
| --- | --- | --- |
| `observations` | Immutable source evidence from Places, crawler, audit or contact parsing | Provider record + payload fingerprint is idempotent; no observation is a canonical fact by itself |
| `facts` | Candidate/accepted/rejected/superseded values linked to evidence | Only one accepted fact per subject + field; promotion uses `promote_fact` |
| `businesses` / `companies` view | Existing physical Company record plus new domain vocabulary | `google_place_id` remains the identity boundary; legacy rows and columns are preserved |
| `websites` | Candidate and canonical website identities | A URL is `candidate` until audit evidence makes it `verified`, `rejected` or `unknown` |
| `contact_sources` | Existing raw public-contact provenance | Historical rows are never deleted; quality state remains reversible |
| `contacts` | Verified public Contact objects | `public_source_only` is required; source URL and observation lineage are retained |
| `website_audits` | Existing audit history with explicit audit state and evidence link | Append-only check; unknown/inconclusive is not treated as unreachable |
| `audit_findings` | Source-backed availability, mobile, conversion and later SEO findings | Unique finding key per audit; evidence observation required |
| `business_scores` | Existing score plus explainable components | Legacy `opportunity_score` stays unchanged; Fit/Need/Reachability/Value/Confidence are additive |
| `opportunities` | Qualification and sales state for an opportunity candidate | Separate from Company; one current opportunity per Company in this MVP |
| `approvals` | Human decisions for external effects | One pending approval per subject/action; share/send/launch are human-only |
| `domain_events` | Append-only orchestration events | Unique idempotency key plus actor and evidence IDs |
| `audit_logs` | Before/after change journal and rollback material | Actor, evidence, timestamp and prior row are retained |
| `agent_jobs` | Durable action request queue | Action name/context/evidence/approval are additive to the existing idempotent job envelope |
| `projects` | Won-client delivery state | Optional link to the originating Opportunity; never created merely because a Company was discovered |
| `lead_dashboard` | Backward-compatible Company/Opportunity read model | Old columns remain in their original order; new ontology fields are appended |
| `growth_os_dashboard` | One-row operating summary | Business state, qualified opportunities, open sales, approvals, projects and Agent work |
| `project_board` | Delivery read model | Adds Opportunity sales state and pending approval count |

## State machines

Company: `discovered → identity_pending → verified/rejected → archived` with review transitions defined in `@growth/ontology`.

Opportunity qualification: `unassessed → screening → qualified/disqualified`.

Sales: `not_started → outreach_ready → contacted → replied → meeting → proposal → won/lost`.

Qualification and sales are intentionally independent. A Company may have no Opportunity; an Opportunity may be qualified while sales has not started.

## Safe backfill

`202609040002_ontology_state_layer.sql`:

1. adds columns and tables without dropping or renaming existing structures;
2. copies provider payloads, audits and public-contact provenance into `observations`;
3. creates evidence-linked facts and explicit Website/Contact objects;
4. copies existing score components and preserves `opportunity_score` exactly;
5. creates an unassessed or legacy-qualified current Opportunity only where an existing score exists;
6. maps old pipeline stages into the new read model while leaving the old fields untouched;
7. adds audit triggers, event storage, RLS and server-only grants.

Apply migrations in filename order through `202609040002_ontology_state_layer.sql`. Before production use, run the migration on a non-production database, compare row counts and sampled lineage, then deploy readers before enabling any future state-transition worker.

## Compatibility fields not yet retired

- `businesses.website_url`, `phone`, `provider_payload`, `pipeline_stage`, `pipeline_status`, `lead_quality_status`
- `contact_sources` as the existing contact-quality history
- `business_scores.business_quality`, `digital_weakness`, `revenue_potential`, `opportunity_score`, `tier`

These are deliberate adapters, not competing sources to extend indefinitely. New workflow code should use Observation/Fact plus Company/Website/Contact/Opportunity state. Retirement requires a later measured migration and explicit approval.
