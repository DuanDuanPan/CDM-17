# Story 1.4: tailwind-spike (Epic E1)

Status: todo

## Story
As the UI team, we need a short spike to decide how to adopt Tailwind in the mono-repo without breaking current screens, so that subsequent stories can execute confidently within the sprint.

## Acceptance Criteria
1. Compare Tailwind vs keeping current stack (CSS Modules/inline) and record decision with reasons.
2. Produce a minimal PoC in `apps/web` rendering one card using Tailwind; hot reload works in dev.
3. Identify risk list: bundle size, CSS purge config, theming approach, dark/light toggle, build speed impact.
4. List refactors needed in `packages/ui` for shared components and how to phase migration.
5. Timebox: <= 1 day effort; conclusion documented.

## Tasks / Subtasks
- Read current global styles and component styling approach.
- Install Tailwind locally in a branch and run PoC card.
- Measure dev server cold start and HMR delta before/after (rough stopwatch).
- Draft migration plan (batches, owners, sequencing).
- Write spike notes.

## Deliverables
- This file updated to "done" with decision and plan.
- PoC snippet checked in under `apps/web/src` (can be removed if decision is "no-go").
- Follow-up Story IDs that will execute the plan.
