# Agent input/output and action contracts

The executable Agent envelope lives in `packages/agent-core/src/index.ts`. The authoritative state machines, events and action permissions live in `packages/ontology/src/index.ts`.

## Boundary

An Agent job is an execution request, not permission to mutate canonical state. Every request receives an `action`. Legacy envelopes without one are mapped to their safest evidence-producing default action. Explicit state-changing actions must include:

- `entityType`;
- `currentState` and `targetState`;
- at least one `evidenceId`;
- an action allowed for that Agent; and
- an Approval ID when the registry policy requires it.

Illegal transitions and permission bypasses fail before the job is queued. `share_demo`, `send_outreach` and `launch_project` are registered as `human_only`, so no Agent type can queue itself as their executor.

Opportunity qualification uses its own transition graph. Sales progression uses the independent `advance_sales_stage` action, so a qualification change cannot silently move a deal and a sales update cannot redefine whether the opportunity is qualified. Agents may use `request_approval` to create a review request from evidence; they still cannot execute the approved external effect.

## Agent defaults

| Agent | Safe default action | Role |
| --- | --- | --- |
| Orchestrator | `plan_next_action` | Reads business state and proposes registered child actions |
| Scout | `record_observation` | Appends raw public provider evidence |
| Audit | `run_website_audit` | Produces WebsiteAudit and AuditFinding evidence |
| Demo Generator | `generate_demo` | Produces a reviewable preview from evidence-linked facts |
| Outreach Drafter | `draft_outreach` | Produces a draft only; never sends |
| Project Tracker | `update_project` | Proposes evidence-backed delivery progress |

## Explicit state action example

```json
{
  "agentType": "orchestrator",
  "businessId": "11111111-1111-4111-8111-111111111111",
  "action": "qualify_opportunity",
  "actionContext": {
    "entityType": "opportunity",
    "currentState": "screening",
    "targetState": "qualified",
    "evidenceIds": ["22222222-2222-4222-8222-222222222222"]
  },
  "input": { "opportunityId": "33333333-3333-4333-8333-333333333333" },
  "idempotencyKey": "qualify:opportunity:33333333:v1",
  "priority": 70
}
```

`POST /api/agent-jobs` validates and persists the action metadata, returning HTTP 202. It does not execute the job or any external effect. `GET /api/agent-jobs` returns the durable queue.

## Audit and event contract

State writers must supply actor and evidence IDs. The persistence layer stores before/after state and rollback data in `audit_logs`. Significant accepted transitions emit idempotent events such as `company.verified`, `website.verified`, `audit.completed`, `opportunity.qualified` and `contact.verified`.

The current branch implements events for Lead Engine observation, identity, website audit and public-contact persistence. `opportunity.qualified` is registered but will not be emitted until a reviewed transition executor is introduced.
