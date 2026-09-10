---
name: frontend-design
description: Design or refine distinctive, production-quality interfaces for the Local Business Growth OS and its client demo sites. Use for dashboards, pipeline screens, landing pages, React components, responsive layouts, or visual polish.
---

# Frontend design

Start from the real audience and job of the screen. Distinguish the internal Growth OS from a client demo: the OS should feel trustworthy, dense enough for operations, and easy to scan; a client demo should derive its visual identity from that business's verified industry, location, services, and brand material.

Before coding, state a compact direction for color, typography, layout, and the one memorable visual idea. Check that each choice belongs to this subject instead of a generic dashboard or AI landing-page template. Preserve an existing design system unless the task explicitly changes it.

Use real provided content. Do not invent business claims, testimonials, awards, addresses, reviews, prices, or performance metrics. Make missing information visibly provisional.

Build working interaction states, including loading, empty, error, disabled, hover, focus, and success where relevant. Use plain action labels that describe the result. Keep keyboard navigation visible, respect reduced motion, and verify mobile and desktop layouts.

Finish by reviewing rendered screenshots, overflow, hierarchy, contrast, typography, and state clarity. When multiple React components change, also apply `react-best-practices`; use `webapp-testing` and `agent-browser` for rendered verification.

Source basis: adapted for this repository from Anthropic's `frontend-design` skill after security review.
