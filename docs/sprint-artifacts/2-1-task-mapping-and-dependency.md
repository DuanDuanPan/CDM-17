# Story 2.1: task-mapping-and-dependency

Status: done

## Story

作为 需要把脑图节点映射为可执行任务并在甘特/时间轴中排期的用户（产品/研发/项目经理），  
我想 将节点标记为任务并配置开始/结束/进度等字段，同时支持 FS/SS/FF/SF 等依赖阻塞关系，  
以便 基于依赖约束进行排期、识别被阻塞的任务，并在协同场景中保持一致与可追溯。

## Acceptance Criteria

1. 任务映射：任意节点可切换为 `Node.kind = 'task'` 并持久化；任务字段可编辑并持久化（至少：`fields.start`、`fields.end`、`fields.progress`、`fields.status`）。
2. 字段约定：`start/end` 支持 `YYYY-MM-DD` 或 ISO 字符串；`progress` 为 0–100 的 number；`status` 为 `todo|doing|done`（默认 `todo`）。
3. 依赖类型：在 `relation='depends-on'` 的依赖边上支持 FS/SS/FF/SF 四类依赖类型（新增字段或 metadata 均可）；UI 可选择/编辑；默认 FS；旧数据（无类型）视为 FS。
4. 阻塞判定（MVP 规则）：当依赖关系无法满足时，任务在甘特/时间轴/看板中呈现为 `blocked`，并显示阻塞来源（上游任务 + 依赖类型 + 约束条件）。
5. 校验规则：禁止自依赖、禁止重复依赖；依赖编辑需校验节点存在、依赖类型有效；日期字段无法解析时视为不可满足并提示原因。
6. 批量/定期任务（最小可用）：至少提供一种批量编辑（例如批量设置 `status`）；至少提供一种定期/重复任务配置字段（例如 `fields.recurrence`），本 Story 仅要求“可配置并持久化”，不要求自动生成子任务。
7. 协同一致：依赖与任务字段的修改通过现有 WS 同步机制广播；断线重连后可拉取并恢复一致状态（包含依赖类型与任务字段）。
8. 权限与审计：viewer/readonly 不可写入任务字段/依赖；变更写入 `/audit/events`；访问记录包含 graphId/action/role/classification（如适用）。
9. 观测与性能：关键交互写入 `/metrics`（依赖类型编辑、任务字段编辑、批量编辑）；在 1k 节点规模下主要交互 P95 < 100ms（预览环境）。

### Dependency Semantics (定义)

约定 `Edge` 语义：`from` 任务依赖 `to` 任务（即 `from` 为后继/被约束方，`to` 为前置/约束方）。

- FS（Finish → Start）：`from.start >= to.end`
- SS（Start → Start）：`from.start >= to.start`
- FF（Finish → Finish）：`from.end >= to.end`
- SF（Start → Finish）：`from.end >= to.start`

当参与比较的字段缺失或无法解析时，判定为 `blocked`，并在 UI 给出“缺失/无效字段”的原因。

## Tasks / Subtasks

- [x] 数据模型
  - [x] `Node.kind='task'` 与任务字段 schema（`start/end/progress/status/recurrence`）
  - [x] 依赖类型字段：FS/SS/FF/SF（建议为 `Edge.dependencyType?: 'FS'|'SS'|'FF'|'SF'`；旧数据默认 FS）
- [x] 依赖编辑
  - [x] 新增/移除依赖时可选择依赖类型（默认 FS）
  - [x] 依赖与字段的合法性校验（自依赖、重复、缺失节点、无效日期、无效依赖类型）
- [x] 阻塞计算与展示
  - [x] 最小阻塞判定（按 FS/SS/FF/SF 规则计算）
  - [x] 甘特/时间轴/看板展示 blocked 状态 + 阻塞来源（上游 + 类型 + 条件）
- [x] 批量/定期任务
  - [x] 批量设置（至少 status）
  - [x] 定期任务字段（`recurrence`）编辑 + 展示（不做自动派生）
- [x] 协同/权限/审计/观测
  - [x] 复用 `graph-update/graph-sync` 同步
  - [x] 服务端权限拒绝 + 前端 UI 禁用提示
  - [x] `/audit/events`、`/visits`、`/metrics` 覆盖
- [x] 测试
  - [x] Playwright：依赖类型编辑 + 阻塞显示
  - [x] WS 脚本：依赖类型同步一致；viewer 写入被拒绝

## Dev Notes

- 依赖类型建议作为 `Edge` 的新增字段或 metadata（避免用 `relation` 承载 FS/SS/FF/SF，保留 `relation='depends-on'` 语义）。
- 阻塞判定 MVP 仅基于 `start/end`（字符串日期）做比较；后续再引入统一的日期/时区与工作日历策略、以及自动排期（critical path / 推演）。
- 与 US1.3 的“跨视图依赖可编辑”保持兼容：旧的 `depends-on` 默认视为 FS。
- 非目标：本 Story 不实现完整排程算法（资源/工时/日历）、也不要求环依赖检测/打断（可后续补强）。

### References

- 需求来源：`docs/epics-and-stories.md` → E2 / US2.1
- 相关故事：`docs/sprint-artifacts/1-3-mindmap-gantt-timeline-board.md`

## Dev Agent Record

- 交付范围：任务字段（start/end/progress/status/recurrence）编辑与持久化；依赖类型（FS/SS/FF/SF）编辑；blocked 计算与甘特/时间轴/看板展示；批量状态设置；协同同步；审计/访问/指标埋点。
- 验证：`pnpm --filter @cdm/web test`（2025-12-13，13 passed）。
