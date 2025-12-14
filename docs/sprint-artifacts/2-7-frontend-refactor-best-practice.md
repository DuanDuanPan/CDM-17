# Story 2.7: frontend-refactor-best-practice (Epic E2)

Status: done

## Story
As the team, we need to refactor the frontend structure to align with the documented best practices, so future stories (including 2-6) can be developed on a clean, maintainable baseline.

## Acceptance Criteria
1. Split the monolithic `apps/web/src/app.tsx` into feature-level components and hooks (workspace shell, toolbar/mode switch, task panel, dependency panel, perf panel), each <300 lines.
2. Introduce `packages/ui` for base components (Button/Badge/Card/Input) and replace hardcoded `.btn/.select` usages in `apps/web` with these components.
3. Ensure Tailwind tokens/config are the single source of truth; `packages/ui` consumes them, no duplicate configs.
4. Add at least one test or Storybook/screenshot per new base component; lint/build pass.
5. Update `docs/architecture.md` and related stories to reference the new structure; migration notes recorded.

## Tasks / Subtasks
- Create base UI components in `packages/ui` (Button/Badge/Card/Input) using Tailwind tokens.
- Refactor `apps/web/src/app.tsx` into smaller components + hooks; keep behavior unchanged.
- Replace `.btn/.select` and inline styles in primary workspace views with `@cdm/ui` components.
- Add Storybook stories or snapshot/screenshot for the new components.
- Run `pnpm --recursive lint` and `pnpm --filter @cdm/web build`.

## DoR / Validation (2025-12-13)
- Dependencies: Tailwind config ready (Story 2-5 done); best-practice documented in `docs/architecture.md`.
- Risks: Layout regressions; mitigated by screenshot/Story/smoke; rollback via keeping legacy styles in git history.
- Owner: bob (建议)；Due: 2025-12-26；SP: 5。

## Migration Notes (implemented)
- Workspace entry now lives in `apps/web/src/features/workspace/workspace-page.tsx`; `apps/web/src/app.tsx` only handles POC routing (`?poc=tailwind|uikit`) + workspace entry.
- Workspace structure follows best-practice split: `apps/web/src/features/workspace/{model,hooks,views,components}`.
- Base UI components are consolidated in `packages/ui/src/components/*` and exported via `packages/ui/src/index.ts` (`Button/Badge/Card/Input/Select`).
- Legacy `.btn/.select` styles are removed; workspace CSS is now scoped to `apps/web/src/features/workspace/styles/workspace.css`.
- Visual/test proof: visit `/?poc=uikit` and see Playwright `apps/web/tests/ui-kit.spec.ts`.
