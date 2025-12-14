# Story 1.3: mindmap-gantt-timeline-board

Status: done

## Story

作为 需要在“脑图 ↔ 甘特/时间轴看板”之间切换的用户（产品/研发/项目经理），  
我想 脑图与甘特/时间轴看板共享同一份数据源，并且依赖关系可以在任意视图中编辑，  
以便 在不同视角下规划与追踪进度，同时保证协同一致与版本可追溯。

## Acceptance Criteria

1. 支持脑图视图与甘特（或时间轴看板）视图之间切换，且数据源一致（同一 graphId / 同一数据模型）。
2. 视图切换时保留：选中节点、折叠状态、视口状态（缩放/平移）；返回原视图后状态可恢复。
3. 依赖关系在任意视图修改后，另一视图可即时反映（至少覆盖依赖新增/删除；依赖类型先统一为 `depends-on`，FS/SS 作为后续增强与 US2.1 对齐）。
4. 依赖变更可协同：通过 WS 广播给其他在线用户；断线重连后可拉取并恢复一致状态。
5. 权限控制：viewer/readonly 不可写入依赖；无权限时 UI 提示且服务端拒绝写入；默认水印仍显示。
6. 审计与访问记录：视图切换、依赖变更写入 `/audit/events`；访问记录包含 graphId/action/role/classification（如适用）。
7. 性能基线：在 1k 节点规模下，切换视图与依赖编辑的 P95 交互 < 100ms（预览环境），且可观测（`/metrics`）。

## Tasks / Subtasks

- [x] 数据模型与映射（优先复用现有类型）
  - [x] 任务节点：复用 `@cdm/types` 的 `Node.fields` 承载排期字段（如 `start/end/progress/status`），避免引入新表/新 schema（MVP 不强制 `Node.kind = 'task'`）
  - [x] 依赖边：复用 `@cdm/types` 的 `Edge.relation = 'depends-on'`；MVP 覆盖新增/删除（FS/SS 类型后续与 US2.1 对齐）
- [x] 视图实现
  - [x] 甘特 / 时间轴 / 看板 MVP（共享同一 graph 数据源 + 选中联动）
  - [x] 视图切换与状态保持（选中/折叠/viewport）
- [x] 依赖编辑与同步
  - [x] 依赖编辑入口（任意视图均可新增/删除）
  - [x] 双向同步（同一数据源 + WS 广播）：复用 `graph-update` / `graph-sync`，依赖变更通过更新 `snapshot.edges` 传播
- [x] 权限/水印/审计
  - [x] 服务端写入网关：readonly / 无 token 拒绝写入（HTTP 403 / WS error），前端 UI 禁用并提示；默认水印显示
  - [x] 审计事件与访问记录写入（append-only）
- [x] 测试与观测
  - [x] Playwright：视图切换状态保持；依赖新增/删除协同广播；readonly 拒绝写入
  - [x] WS 脚本：依赖变更对 viewer 广播一致；viewer 写入被拒绝
  - [x] 指标：切换与依赖编辑耗时写入 `/metrics`

## Dev Notes

- 视图层建议集中在 `@cdm/core-client`，将“同一数据源”的状态管理与 WS 同步抽象成可复用 controller/store。
- 服务端建议在 `@cdm/core-server` / 插件层暴露依赖读写接口，并统一走 Permission Gateway + audit hooks。
- 依赖相关能力可能与 E2（任务/依赖）重叠：本 Story 只负责“跨视图一致与可编辑”，不要求完整的任务流转/审批。
- 避免重复造轮子：`packages/core-client/src/index.ts` 已包含 `ViewManager`（layout: mindmap/gantt/timeline/board）与 `LayoutController`（GraphApi + WS graph-sync/update）；`packages/types/src/index.ts` 已包含 `Node.kind` 与 `Edge.relation`（`depends-on`）。

### Project Structure Notes

- Web：`apps/web`
- 协同/状态：`packages/core-client`
- API：`apps/api` + `packages/core-server`
- 权限/审计相关：`packages/plugins/plugin-permission`、`packages/plugins/plugin-audit-log`

### References

- 需求来源：`docs/epics-and-stories.md` → E1 / US1.3
- PRD 对齐：`docs/prd.md` → R14
- 相关：`docs/architecture.md`（协同/权限/审计/性能基线）、`docs/ux-design.md`、`docs/test-design.md`

## Dev Agent Record

### Context Reference

- Epic 1 / US1.3：跨视图一致与可编辑依赖

### Agent Model Used

- GPT-5.2 (Codex CLI)

### Debug Log References

- Playwright traces：`apps/web/test-results/**/trace.zip`（retain-on-failure）
- 代理与连通性：`apps/web/vite.config.ts`（proxy 到 `127.0.0.1:4000`）

### Completion Notes List

- 视图：新增“脑图/甘特/时间轴/看板”切换，保持选中与视口；切换耗时写入 `view.switch.duration`。
- 依赖：基于 `Edge.relation='depends-on'` 的新增/删除；脑图画布虚线橙色渲染；看板展示依赖计数。
- 协同：依赖变更通过 HTTP 保存 + WS `graph-update/graph-sync` 广播，viewer 可实时反映。
- 权限：viewer/readonly 禁止编辑；服务端对无 token 写入返回 403/WS error；水印默认展示。
- 观测：依赖新增/删除耗时写入 `dependency.add.duration` / `dependency.remove.duration`；访问记录补充 `role` 与 `classification`。
- 测试：新增 `view-switch.spec.ts`、`dependency-collab.spec.ts`；更新 `tooling/tests/ws-layout-check.ts` 覆盖 viewer graph-update 拒绝与 depends-on 同步。

### File List

- `apps/web/src/app.tsx`
- `apps/web/src/features/workspace/styles/workspace.css`
- `apps/web/tests/view-switch.spec.ts`
- `apps/web/tests/dependency-collab.spec.ts`
- `apps/web/vite.config.ts`
- `apps/web/playwright.config.ts`
- `apps/web/playwright.global-setup.ts`
- `packages/types/src/index.ts`
- `tooling/tests/ws-layout-check.ts`
- `docs/sprint-artifacts/1-3-mindmap-gantt-timeline-board.md`
