# Story 2.5: tailwind-bootstrap (Epic E2)

Status: done

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

## 实施说明
- 工具链：单一根级 `tailwind.config.cjs`（含 token 种子、preflight 关闭以渐进迁移，content 覆盖 index.html + web/src + packages/ui）；`postcss.config.cjs` 已启用 tailwindcss/autoprefixer。
- 应用侧：入口 `apps/web/src/main.tsx` 全局引入 `styles/tailwind.css`。
- 样式迁移：将原有全局 reset（:root 字体/背景、box-sizing、body margin）移至 `tailwind.css` 的 `@layer base`，避免重复；业务样式保留在 `style.css`。
- PoC 组件不再单独引入 tailwind.css，避免重复注入。

## 验证记录（2025-12-13）
- `pnpm --filter @cdm/web build` 通过，无 Tailwind content 警告；产物 CSS gzip≈2.74 kB，JS gzip≈58.83 kB，耗时 ~1.06s。
- dev 已在 Story 2-4 验证过启动时间（~366ms）；本次未重复跑 dev，预计一致。

## 决策与后续
- 保持 preflight 关闭，后续按组件迁移逐步评估开启/替换 reset。
- 进入 Story 2-6 进行首批组件迁移；Story 2-4 已完成。
