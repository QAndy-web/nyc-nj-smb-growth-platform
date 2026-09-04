---
name: react-best-practices
description: Review or implement React and Next.js App Router code in this monorepo with attention to server/client boundaries, data flow, accessibility, performance, and TypeScript. Use after editing multiple TSX components or changing shared UI/data-fetching patterns.
---

# React and Next.js best practices

Keep Server Components as the default. Add `use client` only for browser APIs, local interactive state, or event handlers, and keep that boundary as small as practical. Never serialize server credentials or service-role data into client props.

Start independent I/O together and avoid request waterfalls. Fetch near the server component that owns the data, deduplicate repeated work, and keep serialized props minimal. Avoid speculative dependencies, barrel imports that pull large modules, and eager loading of heavy optional UI.

Prefer derived values during render over synchronized state and effects. Put interaction logic in event handlers, use stable primitive dependencies, and do not define components inside components. Add memoization only for measured or clearly expensive work.

Preserve type safety at API and database boundaries. Represent loading, empty, unavailable, and error states honestly; never replace missing persisted data with live-looking sample results. Label controls accessibly and keep keyboard focus visible.

After meaningful changes, run the repository lint, typecheck, tests, and build. Use `webapp-testing` for user flows and `agent-browser` for rendered checks.

Source basis: adapted for this repository from the locally installed Vercel `react-best-practices` skill.
