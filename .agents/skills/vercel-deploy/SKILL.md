---
name: vercel-deploy
description: Prepare, inspect, or execute Vercel deployments for this monorepo when the user explicitly asks for deployment work. Use for preview releases, CI configuration, promotion, rollback, logs, or production launch; production always requires explicit approval.
---

# Vercel deployment

Confirm the repository, branch, commit, Vercel project, monorepo root, and requested target before changing deployment state. Do not infer that a build request authorizes a deployment.

Before a preview, run lint, typecheck, tests, and the production build. Resolve lockfile and root-directory problems locally. Keep `VERCEL_TOKEN`, organization/project IDs, Supabase keys, and provider credentials in approved secret stores; never print or commit them.

Use a preview deployment for review. Verify the deployed routes, APIs, console/network behavior, data-unavailable states, and any changed flow before proposing promotion. Record the exact URL, target, status, commit, and verification result.

Production deployment, promotion, rollback, domain changes, database migrations, and publication of a client demo are externally consequential actions. Perform them only after explicit authorization for that action and target. A successful build or preview is not production approval.

After an authorized production action, inspect deployment status and error logs and report any monitoring gap. Do not silently retry a failed state-changing command if the target or outcome is uncertain.

Source basis: adapted for this repository from the locally installed Vercel `deployments-cicd` skill; the repository's human review gates are stricter and take precedence.
