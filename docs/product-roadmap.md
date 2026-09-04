# Product roadmap, MVP acceptance, and early revenue

Last reviewed: 2026-09-04

## Current decision

The product is not ready for a public deployment. The Lead Engine foundation is usable for controlled development, but the existing 17 records must be migrated and re-audited, real-browser QA needs an accessible configured environment, and all admin read/write APIs need a real authenticated session boundary. A server secret must never be placed in client code as a shortcut.

## Next development route

### P0 — Data trust and deployment safety

1. Apply `202609040001_reaudit_existing_leads.sql` in a reviewed staging database.
2. Run `pnpm reaudit:leads -- --limit 25`, inspect the dry run, then run the explicit `--apply` batch for the 17 existing businesses.
3. Compare every official URL in a real browser with the persisted audit. Resolve discrepancies as `unknown`; do not force `reachable` or `unreachable` without evidence.
4. Verify all displayed emails on their official source pages and confirm rejected/superseded historical rows remain retained.
5. Add admin authentication with HttpOnly sessions and authorization on `/api/leads`, `/api/export`, `/api/ingestion`, `/api/agent-jobs`, and `/api/projects`. Mutations must fail closed; service-role and provider credentials remain server-only.

### P1 — Controlled multi-industry pilot

1. Run Pilot A from `industry-pilot-plan.md`: HVAC, plumbers, med spas, and law firms, 10 qualified businesses per bounded run.
2. Add manual truth labels for website status, contact validity, duplicate/franchise status, and commercial plausibility.
3. Show score version, quality status, source timestamp, and unresolved reason in the dashboard.
4. Calibrate weights only from reviewed errors and opportunity yield. Do not optimize the score against raw lead count.

### P2 — Sellable audit and demo workflow

1. Generate a structured audit brief from verified facts: missed CTA, mobile issues, trust/review proof, service pages, local SEO, and contact path.
2. Produce one industry-specific, non-public demo template for HVAC/plumbing first; every claim and asset requires review.
3. Create a human review gate that records approve/reject/revise before a demo can be shared or an outreach draft can leave the system.
4. Track audit minutes, demo minutes, qualified-to-meeting conversion, proposal value, close rate, and monthly gross margin.

## Later route

- Add practice/service subcategories so “law firm” and “general contractor” are not priced or scored as homogeneous markets.
- Add scheduled re-audits with backoff and freshness rules; do not continually crawl unchanged sites.
- Add client onboarding, content/asset approvals, domain/DNS checklist, accessibility checks, analytics consent, and launch rollback.
- Add recurring maintenance, local SEO reporting, review/request workflows, and uptime monitoring only after the first paying customers reveal what they retain.
- Consider outreach sending last. Drafting, approval, suppression, consent/compliance, unsubscribe handling, and audit logs must exist first.

## MVP acceptance criteria

### Data quality

- All 17 historical businesses are `verified` under `phase1-v2`; no record remains silently scored from stale audit/contact inputs.
- Website classification agrees with real-browser review for at least 95% of reviewed sites; every disagreement is `unknown` with evidence.
- Displayed email precision is 100% in the reviewed set, with official source URL, method, confidence, and timestamp.
- Zero unresolved `place_id` duplicates; multi-location businesses remain separate only when the Google place identity is separate.
- Scoring weights and pilot thresholds are versioned/configurable and each component is visible enough to explain a rank.

### Product workflow

- Dashboard, Pipeline, Agents, and Projects work at desktop and mobile widths with no console errors or failed first-party requests in a configured environment.
- Filters and CSV export return the same verified population and never reintroduce rejected/superseded contacts.
- A sample scan is idempotent, capped, observable, and cannot be anonymously triggered in a public environment.
- Agent jobs are idempotent; demos and outreach drafts stop at `needs_review`; no send/share/deploy action exists without explicit human approval.

### Engineering and operations

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass on the exact release commit.
- Migrations are additive and preserve historical audit/contact evidence; rollback is a status change or database restore, not reconstruction from deleted rows.
- Provider cost/rate-limit errors and per-business failures are visible without logging credentials or provider payload secrets.
- Staging is verified before any production deployment; production release and rollback require explicit approval.

## Earliest revenue plan

Start with a founder-led, manually reviewed offer rather than waiting for autonomous agents.

1. Choose HVAC/plumbing in one compact territory first. Their urgent local intent makes a clearer conversion story than broad legal/accounting, while avoiding med-spa medical-claims risk in the first sale.
2. Select 10 verified businesses with strong operating signals and weak quote/contact paths. Build three private example audits and one reusable demo template. Do not publish or contact anyone automatically.
3. Offer a paid “Local Conversion Launch”: website/landing-page rebuild, click-to-call/quote flow, analytics, Google Business Profile consistency checklist, and 30 days of fixes.
4. Test pricing as a range, not a permanent rate: `$1,500–$3,000` setup with 50% upfront; `$149–$299/month` care plan; `$499–$999/month` growth/SEO only after baseline tracking exists. Discount scope, not quality, for the first reference customer.
5. Validate unit economics before scaling: target at least 60% gross margin on setup, less than 10 hours of delivery work for the starter package, and a measurable call/form conversion baseline. Stop adding leads if fulfillment or close-rate evidence is missing.

The first commercial milestone is one paid setup plus one recurring care plan—not a large scraped database. After three paying customers, use observed sales cycle, delivery time, support load, and retained monthly value to choose the next industry and automation investment.
