# Story 1.5: tailwind-bootstrap (Epic E1)

Status: todo

## Story
As a developer, I want Tailwind configured at repo level so I can build and run web without manual CSS setup.

## Acceptance Criteria
1. Tailwind dev dependencies added at root: tailwindcss, postcss, autoprefixer (pnpm workspace-friendly).
2. `tailwind.config.cjs` includes content paths for `apps/web/src/**/*.{ts,tsx}` and `packages/ui/**/*.{ts,tsx}`, and extends theme with agreed tokens.
3. `postcss.config.cjs` loads `tailwindcss` and `autoprefixer`.
4. Global entry imports `styles/tailwind.css` containing `@tailwind base; @tailwind components; @tailwind utilities;` and any reset migrated there.
5. `pnpm --filter @cdm/web dev` and `pnpm --filter @cdm/web build` succeed without regressions.
6. Token table and setup commands documented in this story file.

## Tasks / Subtasks
- Add dev deps: `pnpm add -D tailwindcss postcss autoprefixer`.
- Create or update `tailwind.config.cjs` and `postcss.config.cjs`.
- Add `apps/web/src/styles/tailwind.css` and import it in the web entry file (e.g., `apps/web/src/main.tsx`).
- Move existing reset/global styles into the new stylesheet, avoiding duplicate globals.
- Copy the token seed below into `tailwind.config.cjs` theme.extend.
- Run dev/build commands and note outcomes.

## Token seed (proposed)
- Colors: primary #2F80ED, primary-foreground #F7FBFF, neutral #111827/#374151/#F3F4F6, success #10B981, warning #F59E0B, danger #EF4444, info #0EA5E9, surface #FFFFFF/#F8FAFC, border #E5E7EB.
- Radius: sm 6px, md 10px, lg 14px, xl 20px.
- Shadow: sm 0 4px 10px -2px rgba(15,23,42,0.15); lg 0 20px 60px -24px rgba(15,23,42,0.25).
- Spacing: default Tailwind scale plus 18 (4.5rem) and 30 (7.5rem) for card gutters.
- Font: use project default stack; add display size 2.75rem if needed.

## Deliverables
- Repo builds with Tailwind enabled; status flipped to done.
- Token list agreed and reflected in `tailwind.config.cjs`.
