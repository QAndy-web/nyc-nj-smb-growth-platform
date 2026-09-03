# Agent input/output contracts

The executable TypeScript contract map lives in `packages/agent-core/src/index.ts`. Every job envelope includes `agentType`, structured `input`, optional `businessId`/`projectId`, priority and an optional caller-supplied idempotency key.

| Agent | Required input | Structured output | Gate |
| --- | --- | --- | --- |
| Orchestrator | goal, allowed agents, optional target | ordered child jobs + reason, next checkpoint | Cannot bypass specialist/human gates |
| Scout | territory, category, cell/page limits | business IDs, fetched/upserted/error counts | Provider terms, rate and cost bounds |
| Audit | business ID, basic/detailed level | audit ID, status, source-backed findings | Evidence URLs required |
| Demo Generator | business ID, audit ID, template ID | demo ID, preview URL, review required | Human review before sharing/publishing |
| Outreach Drafter | business ID, optional demo ID, email channel | subject/body, source facts, approval required | Never sends automatically |
| Project Tracker | project ID, event, optional evidence | progress, status, blockers, next action | Launch completion requires QA evidence |

## API envelope

`POST /api/agent-jobs` validates the envelope and inserts or returns the existing job for the same idempotency key. It returns HTTP 202 and does not execute the job.

```json
{
  "agentType": "audit",
  "businessId": "11111111-1111-4111-8111-111111111111",
  "input": { "level": "basic" },
  "idempotencyKey": "audit:business:11111111:v1",
  "priority": 70
}
```

`GET /api/agent-jobs?status=queued&agentType=audit` returns recent persisted jobs. Invalid filters are ignored; invalid create envelopes fail clearly.
