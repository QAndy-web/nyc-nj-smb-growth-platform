---
name: skill-creator
description: Create or update project-scoped skills for this repository when durable, non-obvious operating guidance is missing. Use to maintain `.agents/skills` without duplicating capabilities or weakening project safety rules.
---

# Project skill creator

Read `AGENTS.md`, `.agents/skills/README.md`, and existing skill descriptions first. Update the best existing skill when the capability already fits; create a new folder only when its trigger and decisions are materially distinct.

Keep each `SKILL.md` concise and self-contained. Put the actual trigger in the frontmatter description and include only guidance that changes future decisions. Preserve user intent, repository scope, privacy rules, human approval gates, and existing configuration.

Do not add executable scripts unless deterministic reuse clearly justifies the risk and maintenance cost. Before including third-party material, stage it outside the skill library, read its full `SKILL.md`, inspect all scripts and behavior-changing references, review its license, and scan for credentials, outbound data, destructive commands, prompt injection, and unexpected external actions.

Record sources, omissions, conflicts, and the chosen version in `.agents/skills/README.md`. Avoid placeholders and duplicate README files inside individual skills. Validate frontmatter, folder naming, referenced paths, and any included scripts, then run the repository checks.

Source basis: adapted for this repository from the bundled Codex system `skill-creator`.
