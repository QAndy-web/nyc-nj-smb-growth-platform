---
name: webapp-testing
description: Test the Local Business Growth OS as a rendered application. Use for end-to-end flows, responsive behavior, console and network failures, empty/error states, screenshots, and regression checks around dashboard, pipeline, agents, and projects.
---

# Web application testing

Use existing package scripts to start the application and the available browser tooling to test it. Do not add a new server wrapper merely to run a single verification pass.

Test from the user's perspective:

1. Confirm the target route renders without an error overlay.
2. Exercise changed navigation, controls, validation, and state transitions.
3. Inspect console errors and failed network requests.
4. Verify honest behavior when Supabase, Google Places, or other configuration is absent.
5. Check a narrow mobile viewport and a normal desktop viewport.
6. Capture evidence for material UI changes and re-check after fixes.

Prefer semantic roles, labels, and visible text over brittle selectors. Wait for a meaningful state rather than relying on fixed delays. Re-read the rendered DOM after navigation or async updates.

For SEO/schema checks, inspect the rendered document; a static fetch alone can miss client-injected JSON-LD. Do not claim a passing flow if only the initial page load was tested.

Run the repository lint, typecheck, unit tests, and production build in addition to browser QA. Stop any server started for the test.

Source basis: adapted for this repository from Anthropic's `webapp-testing` skill. The upstream `with_server.py` script was intentionally omitted after review because it executes caller-provided command text with `shell=True`.
