# Story 1.6: tailwind-migrate-batch1 (Epic E1)

Status: todo

## Story
As a user, I need the highest-traffic UI elements restyled with Tailwind so the product looks modern while keeping behavior unchanged.

## Acceptance Criteria
1. Convert at least three shared components in `packages/ui` to Tailwind classes (button, card/tile, input or badge) with existing props preserved.
2. Pages using those components in `apps/web` are updated to the new styles with no layout break; workspace view is manually smoked.
3. Lightweight visual check exists: Storybook story, snapshot, or before/after screenshots attached to this story.
4. Lint and build remain green; bundle size delta noted.
5. Migration notes captured here (patterns to reuse, pitfalls).

## Tasks / Subtasks
- Identify target components and their import locations.
- Rebuild components with Tailwind utilities, referencing shared tokens.
- Replace usages in workspace screens to validate real layout.
- Add optional Storybook stories or screenshot diffs for the migrated components.
- Run `pnpm --recursive lint` and `pnpm --filter @cdm/web build`.

## Migration guide (short)
- Prefer composing utilities over heavy `@apply`; keep class lists readable.
- Keep spacing on token scale; reuse shared shadow/radius tokens.
- Use Tailwind variants for focus/hover/active; ensure focus ring is visible.
- Theme via CSS vars in Tailwind config to keep brand swap easy.

## Deliverables
- Updated components in `packages/ui` and their usages in `apps/web`.
- Visual evidence of the new look (story, snapshots, or screenshots).
- This file marked done with notes and links.
