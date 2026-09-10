# Phase 1 architecture

## Data flow

1. The admin submits a territory and category to `POST /api/ingestion`.
2. The configured territory bounds are converted into reusable grid centers.
3. The Google Places adapter runs Text Search (New) around each center, follows page tokens, throttles calls, and retries rate-limit/transient errors.
4. The pipeline removes duplicate place IDs within the run. Postgres performs the durable idempotent upsert through the unique `google_place_id` constraint.
5. Each business website is fetched with a timeout and classified as `missing`, `unreachable`, `weak`, or `reachable`.
6. Reachable official pages are scanned for emails that are actually present in page text or `mailto:` links. Only same-origin contact/about links are followed. No address is generated or guessed.
7. The scoring package calculates independently testable component scores and the final tier.
8. The `lead_dashboard` view selects the latest audit, current score, and newest public email/source for filtering and export.

## Security and data handling

- Base tables have RLS enabled and no browser policies. The service-role key is used only in server route handlers.
- Public contact discovery accepts only public HTTP(S) website URLs, blocks common local/private hosts, and records a source URL for every email.
- Secrets are read at request time, so missing configuration produces a clear API error without leaking values or breaking the static application build.

## Idempotency and history

- Businesses are upserted on `google_place_id` and update `last_seen_at` on every sighting.
- Scores are upserted one-to-one with businesses.
- Website audits append history; the dashboard view chooses the newest audit.
- Contact rows are unique by business, email, and source URL.

## Known Phase 1 limits

- The ingestion route is synchronous and bounded to five cells / three pages per request. A durable queue is appropriate before full NYC/NJ production sweeps.
- Website quality uses deterministic reachability/mobile/CTA signals, not a full Lighthouse or visual audit.
- Email parsing intentionally prioritizes traceability over recall and does not query data brokers or guess address patterns.
- Territory bounds are operational seed configuration, not legal/administrative boundary polygons.
