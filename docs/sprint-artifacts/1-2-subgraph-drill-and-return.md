# Story 1.2: subgraph-drill-and-return

Status: done

## Story

作为 需要在大图中聚焦特定模块的用户，  
我想 对选中节点下钻成子图并能快速返回主图/上级，  
以便 专注编辑局部、避免干扰，同时保证上下文一致和版本可追溯。

## Acceptance Criteria

1. 选中节点可“一键下钻”成子图视图，显示其子树及关联边；支持面包屑/返回按钮回到主图或上一级。  
2. 子图编辑的节点/边/布局变更写回主图，返回后状态一致；撤销/重做跨下钻上下文可用。  
3. 下钻时保留选中/视口状态；返回时恢复主图原选中与视口。  
4. 权限校验：无权限节点/附件在子图中遮罩；水印默认开启。  
5. 审计与访问记录：下钻/返回、子图保存写入审计；访问记录包含 graphId/nodeId/action 与密级。  
6. 性能：1k 节点场景下下钻/返回 P95 < 100ms（预览环境）；数据请求与渲染可观测。  

## Tasks / Subtasks

- [x] 交互与状态  
  - [x] 面包屑/返回控件；记录主图选中与视口状态，返回时恢复（toolbar 下钻/返回，栈式保存 offset/scale/选中）。  
  - [x] 下钻视图的数据装载与渲染（子图按 nodeId 派生 graphId，加载/保存 graph snapshot；支持撤销/重做并可跨下钻上下文使用）。  
- [x] 数据与同步  
  - [x] 子图编辑（节点/边/布局）写回主图存储；WS 广播同步主/子视图（graph-update/graph-sync）。  
  - [x] 权限与水印：只读(viewer)遮罩 folded 或非 public 密级节点并禁止写；水印默认开启。  
- [x] 审计与访问记录  
  - [x] 记录下钻、返回、子图保存到 `/audit/events`；访问记录 `/visits` 包含 graphId/nodeId/action 与密级(classification)。  
  - [x] 将日志写入 `data/*.jsonl`（保持现有持久化路径）。  
- [x] 性能与观测  
  - [x] 埋点：下钻/返回耗时写入 `/metrics`；前端展示 drill/return P95 与样本数（含渲染基线）。  
- [x] 测试  
  - [x] Playwright：下钻-编辑-返回状态保持；只读模式拒绝下钻（`apps/web/tests/drill-return.spec.ts`）。  
  - [x] Playwright：撤销/重做可跨下钻上下文使用（`apps/web/tests/undo-redo.spec.ts`）。  
  - [x] WS 脚本/集成：editor 改动可同步给 viewer；viewer 无法写入（`tooling/tests/ws-layout-check.ts` 已扩展 graph-sync）。  

## Dev Notes

- 数据源：复用 `@cdm/core-client` 状态与 `@cdm/core-server` 布局/审计接口；可在 repo 中为子图创建临时 graphId 或使用 nodeId 派生。  
- 观测：前端埋点 → `/metrics`；审计/访问记录 → `data/*.jsonl`（已存在端点）。  
- 权限：沿用只读参数 `?readonly=1`，需要在下钻 API/WS 层校验 role/viewer 禁止写入。  

### Project Structure Notes

- 前端：`apps/web` 画布与状态；协同：`@cdm/core-client`；API：`apps/api`。  
- 后端：布局/审计/访问存储在文件（当前），后续可替换持久化实现。  

### References

- 需求来源：`docs/epics-and-stories.md` → E1 / US1.2  
- 相关：`docs/architecture.md` 性能/权限/审计基线；`docs/test-design.md` 测试策略。  

## Dev Agent Record

### Context Reference

- Story 1.2 (US1.2) 子图下钻与回链
- 相关用例：`apps/web/tests/drill-return.spec.ts`

### Agent Model Used

- GPT-5.2 (Codex CLI)

### Debug Log References

- Playwright：`apps/web/playwright.config.ts`（已加入 `NO_PROXY` 以绕过本机代理导致的 false-positive webServer 检测）
- Playwright traces：`apps/web/test-results/**/trace.zip`（retain-on-failure）

### Completion Notes List

- 下钻/回链：支持多级下钻后按面包屑任意层级回退，回退过程逐层合并子图编辑回父图并恢复视口/选中。
- 撤销/重做：按 graphId 维护历史；子图写回父图前记录父图快照，支持跨下钻上下文撤销/重做。
- 面包屑 UI：工具栏新增“返回主图”按钮与 breadcrumb（根 + 层级节点 label）。
- 资源释放：新增 `LayoutController.close()` 并在 graphId 切换时 cleanup，避免 WS/BroadcastChannel 泄漏。
- Dev 代理：Vite dev 增加 `/layout`、`/graph`、`/audit`、`/metrics`、`/visits`、`/ws` 代理到 API 4000，避免浏览器跨域问题。
- 权限/密级：访问记录与审计 metadata 写入 classification；API viewer 读图时遮罩 folded 或非 public 密级节点。
- 性能可观测：perf panel 展示 drill/return P95 与样本计数；下钻/返回继续写入 `/metrics`。
- 测试：新增 `apps/web/tests/breadcrumb.spec.ts`；Playwright 全量通过（chromium）。
- 工程化：补齐 ESLint v9 flat config（`eslint.config.cjs`）与 Turbo 2.x `tasks` 配置（`turbo.json`）。

### File List

- `apps/web/src/App.tsx`
- `apps/web/src/style.css`
- `apps/web/vite.config.ts`
- `apps/web/playwright.config.ts`
- `apps/web/playwright.global-setup.ts`
- `apps/web/tests/breadcrumb.spec.ts`
- `apps/web/tests/undo-redo.spec.ts`
- `packages/core-client/src/index.ts`
- `apps/api/src/index.ts`
- `packages/types/src/index.ts`
- `eslint.config.cjs`
- `turbo.json`
