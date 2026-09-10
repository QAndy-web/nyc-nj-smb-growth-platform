---
name: task-execution
description: Plan and deliver multi-step or multi-file work in the Local Business Growth platform through minimal relevant context and small verified checkpoints. Use when a change has several dependencies, crosses files, or needs progress reporting; skip for a single obvious edit.
---

# Task execution

Begin by stating the objective, in-scope and out-of-scope work, the shortest useful sequence of checkpoints, and the evidence that will establish success. Use the existing issue, PRD, backlog, or architecture document as the contract when one exists; do not invent a competing plan.

Load context on demand in this order: the applicable `AGENTS.md` rules, the relevant part of the specification, the exact implementation and test files, then the smallest useful error excerpt. Prefer one analogous implementation and its tests over broad repository reads. Summarize discoveries instead of repeatedly reloading unchanged files or full command output.

Deliver one thin, usable increment at a time. Keep each checkpoint small enough to verify and reverse independently. Resolve prerequisite work before dependent work, and avoid speculative abstractions or unrelated cleanup. If implementation exposes an assumption that changes scope, pause that path and report the decision rather than silently expanding the task.

After each completed checkpoint, tell the user:

- **Completed:** the observable result.
- **Evidence:** the focused check and its result.
- **Next:** the next bounded checkpoint.

Keep a compact ledger of completed checkpoints, evidence, decisions, and failed hypotheses in the active task. Reuse an existing project plan when available; do not create several planning files or inject full conversation history merely to preserve state.

Run the narrowest relevant check after each checkpoint. Reserve the repository-wide quality gates for the point at which the integrated change is ready, unless a broad check is necessary to expose cross-package breakage. Do not rerun an unchanged successful check.

Source basis: adapted for this repository from Addy Osmani's context engineering, spec-driven development, planning, and incremental implementation skills.
