---
name: completion-loop-guard
description: Require fresh completion evidence and stop repetitive troubleshooting in the Local Business Growth platform. Use before claiming a task is complete and whenever a test, build, browser flow, or implementation attempt fails repeatedly.
---

# Completion and loop guard

Before claiming success, identify the observable claim being made and the command, browser flow, or artifact inspection that proves it. Run that verification against the current code, read the complete result and exit status, and report failures honestly. Earlier successful output is not evidence after relevant code or configuration changed.

Choose verification proportional to the change:

- focused unit or integration tests for domain logic and provider behavior;
- typecheck and lint for changed TypeScript boundaries;
- migration or schema checks for persistence changes;
- browser evidence for rendered workflows, responsive behavior, console errors, and empty/error states;
- repository `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before completing an integrated implementation unless the change clearly cannot affect a gate.

For every failed attempt, record the hypothesis, the action taken, the observed evidence, and the conclusion. Change one meaningful variable at a time. Do not repeat the same command merely to hope for a different result when inputs are unchanged.

If the same hypothesis fails twice, stop using that approach. Reproduce from a clean boundary, trace the data or control flow, compare with a working path, and form a different testable hypothesis. A third near-identical fix is evidence to reconsider the root cause or architecture, not permission to continue patching.

Distinguish implementation failure from environment, permission, credentials, provider, or network failure. Do not weaken tests, bypass approval gates, inspect unrelated secrets, or replace real data with fake success to make a check pass.

At the end, report what is complete, the fresh evidence, any checks not run and why, and the remaining risk or next step.

Source basis: adapted for this repository from obra's verification-before-completion guidance plus a constrained root-cause retry rule. No upstream scripts or environment-inspection examples are included.
