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
  - [x] 下钻视图的数据装载与渲染（子图按 nodeId 派生 graphId，加载/保存 graph snapshot；撤销/重做占位）。  
- [x] 数据与同步  
  - [x] 子图编辑（节点/边/布局）写回主图存储；WS 广播同步主/子视图（graph-update/graph-sync）。  
  - [x] 权限与水印占位：只读(viewer)遮罩 folded 节点并禁止写；水印默认开启。  
- [x] 审计与访问记录  
  - [x] 记录下钻、返回、子图保存到 `/audit/events`；访问记录 `/visits` 包含 graphId/nodeId/action。  
  - [x] 将日志写入 `data/*.jsonl`（保持现有持久化路径）。  
- [x] 性能与观测  
  - [x] 埋点：下钻/返回耗时写入 `/metrics`（含节点数/布局）。  
- [ ] 测试  
  - [x] Playwright：下钻-编辑-返回状态保持；只读模式拒绝下钻（`apps/web/tests/drill-return.spec.ts`）。  
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

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
