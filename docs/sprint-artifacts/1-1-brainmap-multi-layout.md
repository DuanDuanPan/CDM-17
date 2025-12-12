# Story 1.1: brainmap-multi-layout

Status: in-progress

## Story

作为 脑图协同平台的核心用户（产品/研发/评审人员），  
我想 在自由 / 树 / 逻辑布局间一键切换且保持节点状态与布局，  
以便 在不同视图下高效浏览、编辑并保持空间记忆，不丢失已有布局成果。

## Acceptance Criteria

1. 支持自由、树、逻辑三种布局互切，切回后节点位置/折叠状态不丢失。  
2. 自由布局提供对齐线、吸附、网格、距离线四个开关，开关状态可持久化。  
3. 1k 节点场景下切换/拖拽/折叠的 P95 < 100ms（预览环境），性能数据可观测。  
4. 视图切换保持选中/焦点节点；撤销/重做在各布局下生效。  
5. 布局状态持久化到后端 Layout 存储，协同用户看到一致结果；无权限用户不可写入。  
6. 操作被审计：切换布局、开关变更写入审计/访问记录（含用户/时间/IP/密级）。  
7. 无权限或密级不足时，界面提示并拒绝布局写入；默认水印仍显示。

## Tasks / Subtasks

- [x] 布局状态模型与持久化  
  - [x] 定义布局状态 schema（布局类型、节点坐标/折叠、开关状态、版本号）。  
  - [x] 后端接口：GET/PUT 布局状态（走权限网关，写审计）。  
- [ ] 前端布局引擎  
  - [x] 实现自由/树/逻辑的切换与状态恢复；吸附/对齐线/网格/距离线开关。  
  - [ ] 1k 节点渲染优化：视口分片、线裁剪、增量重绘。  
- [ ] 协同与容错  
  - [x] 切换/开关变更通过 WS 同步（BroadcastChannel 本地多标签模拟）；断线重连后状态一致。  
  - [x] 权限不足提示与降级（URL `?readonly=1` 进入只读）。  
- [ ] 观测与验收  
  - [x] 前端埋点：布局切换/渲染基线写入 `/metrics`（含节点数/布局）。  
  - [ ] 审计/访问记录写入验证；安全回归（默认水印）。  
- [ ] 测试  
  - [x] 生成 1k 节点数据集，自动化场景：基线渲染耗时占位（tooling/scripts/perf-layout.ts）。  
  - [ ] e2e 校验选中保持、权限拒绝、协同一致性。

## Dev Notes

- 参考 `docs/architecture.md`：布局引擎与权限/水印在“关键组件”与“非功能”章节；性能/安全基线（P95 <100ms，默认水印）。  
- 前端：React + WebSocket 协同；建议在 `packages/core-client` 增加布局状态管理与 WS 同步；UI 控件可放 `@cdm/ui`。  
- 后端：在 `@cdm/core-server` / 插件层暴露布局存取与审计钩子；权限走 Permission Gateway。  
- 观测：前端埋点 + 后端审计/访问记录，导出/分享无涉及但水印需保留。  

### Project Structure Notes

- Web 入口：`apps/web`；核心状态/协同：`packages/core-client`；UI 控件：`packages/ui`；后端：`apps/api` + `packages/core-server`。  
- 数据与存储接口暂为 stub，可在 `packages/database` 添加布局集合/索引；注意 append-only 审计。

### References

- 需求来源：`docs/epics-and-stories.md` → E1 / US1.1  
- 架构约束：`docs/architecture.md`（性能/安全基线、布局引擎、审计/权限）  

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
 - packages/types/src/index.ts
 - packages/database/src/index.ts
 - packages/core-server/src/layout.ts
 - apps/api/src/index.ts
 - packages/sdk/src/index.ts
 - packages/core-client/src/index.ts
 - apps/web/src/App.tsx
 - apps/web/src/style.css
 - apps/web/vite.config.ts
 - tooling/scripts/perf-layout.ts
