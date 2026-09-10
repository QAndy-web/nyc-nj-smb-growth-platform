---
name: architecture-quality-gate
description: Protect module boundaries and maintainability when a Local Business Growth feature or refactor changes schemas, APIs, shared state, workflows, or multiple packages. Use before and after structurally significant changes; do not load for isolated copy or style edits.
---

# Architecture quality gate

Before editing, identify the existing owner of the behavior and trace the smallest affected path across database, provider, domain, API, and UI boundaries. Extend the current source of truth when it fits. If it does not fit, state the mismatch before introducing a new abstraction.

Check the proposed design for:

- one authoritative representation of each business concept, status, and workflow transition;
- explicit boundaries between provider adapters, domain logic, persistence, API transport, and presentation;
- idempotency for ingestion, jobs, and external-provider operations;
- migrations and API contracts that remain backward-safe where practical;
- shared helpers that remove real duplication without becoming generic dumping grounds;
- configuration instead of copied territory, category, scoring, or provider constants;
- observable errors and honest unavailable states instead of hidden fallbacks or fabricated data.

Treat repeated conditionals, duplicated mappings, parallel state models, and cross-layer imports as design signals. Do not bolt a new special case onto an unrelated flow merely because it is the shortest local edit. Prefer a narrow extension point, but do not create a framework for hypothetical future requirements.

After implementation, review the complete affected path rather than only the edited lines. Confirm that responsibilities are clearer or unchanged, no second source of truth was introduced, tests cover the new contract at the correct layer, and documentation reflects any durable boundary change.

Use `react-best-practices` for React and Next.js-specific decisions. This skill remains responsible for repository-wide database, API, worker, agent, and package architecture.

Source basis: adapted for this repository from Addy Osmani's code review and quality guidance.
