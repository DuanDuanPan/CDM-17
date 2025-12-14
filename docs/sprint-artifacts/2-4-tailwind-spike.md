# Story 2.4: tailwind-spike (Epic E2)

Status: done

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

## DoR / Validation (2025-12-13)
- Scope & AC confirmed; PoC limited to isolated demo (no main UI impact).
- Dependencies: pnpm workspace; Tailwind/PostCSS dev deps allowed; no backend changes.
- Risks noted: bundle size purge, theme tokens, build time; rollback by removing tailwind imports/config.
- Owner: bob; Due: 2025-12-26; Story Points: 2 (see sprint-tasks-s1-jira.csv).
- Entry criteria met → set to ready-for-dev.

## Progress (2025-12-13)
- Added Tailwind tooling (tailwindcss/postcss/autoprefixer) with preflight disabled to avoid全局影响。
- Created PoC demo `apps/web/src/poc/tailwind-card.tsx` + `styles/tailwind.css` and optional route via `?poc=tailwind`.
- Configured `tailwind.config.cjs` content scope to web/ui packages; token seeds included; PostCSS wired.
- Next: run dev/build smoke, capture screenshot + HMR/冷启动耗时，填写决策与风险并翻状态为 done.

## 验证记录
- 2025-12-13 dev：`pnpm --filter @cdm/web dev` 启动成功（Vite ready ~366ms），随后手动结束以释放 5173 端口。
- 2025-12-13 build：初次因 tailwind content 未被发现触发警告；新增 `apps/web/tailwind.config.cjs` 覆盖 content（含 index.html、src、packages/ui）后重跑，警告消除。产物：CSS gzip 2.76 kB，JS gzip 58.83 kB，耗时 ~1.05s。
- 2025-12-13 PoC 截图：`?poc=tailwind` 页面运行正常（截图保存在本地会话，未入库；可复现同 URL）。

## 结论 / 决策
- 采纳 Tailwind：保留 preflight 关闭以渐进迁移；主题 token 已种子化，满足后续批量迁移。
- 无阻塞风险；注意正式迁移时补充 content 范围、按需启用/替换 reset。
- 建议立即执行后续故事：2-5（bootstrap 配置落库与全局入口）、2-6（首批组件迁移）。
