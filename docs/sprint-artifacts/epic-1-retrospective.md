# Epic 1 Retrospective: 核心脑图与多视图

Status: completed

Date: 2025-12-13

## Scope

Epic 1 覆盖 US1.1～US1.3：

- US1.1 脑图多布局（free/tree/logic）与布局开关（snap/grid/guide/distance）
- US1.2 子图下钻与回链（面包屑、多级返回、状态恢复、撤销/重做）
- US1.3 跨视图（脑图/甘特/时间轴/看板）共享数据源与依赖编辑（depends-on）

## What Shipped

- 多布局与协同基础链路跑通：布局切换、开关状态持久化与 WS 广播（editor → viewer）
- 下钻/回链全链路：子图生成、合并回父图、面包屑导航、视口/选中恢复；撤销/重做覆盖跨下钻上下文
- 多视图切换与依赖：新增视图 tabs；依赖新增/删除（`relation='depends-on'`）跨视图即时反映；看板/甘特/时间轴提供任务字段只读渲染
- 观测与审计：关键行为写入 `/metrics`、`/audit/events`，并补齐 `/visits`（含 `role` 与 `classification`）

## What Went Well

- 复用既有同步协议：依赖与子图合并沿用 `graph-update/graph-sync`，减少协议碎片化
- E2E 回归价值高：Playwright + WS 脚本覆盖了关键路径（只读拒绝写、协同广播、状态保持），避免“看起来能用但不可回归”
- 测试稳定性提升明显：本地代理/localhost 相关不稳定被系统性收敛到 `127.0.0.1` 方案

## What Didn’t Go Well / Risks

- `apps/web/src/App.tsx` 体积偏大，逻辑耦合（视图、同步、历史、UI）使后续扩展成本上升
- 部分产品语义受测试约束：
  - readonly 下不允许改变选中（当前由测试锁死），可能与真实“可看不可改但可选中”需求冲突
  - 下钻进入子图会覆盖同名子图快照以保证确定性，可能影响“复用既有子图”的用户预期
- Playwright 目前串行跑（workers=1）保证稳定，但会拖慢 CI；需要后续做用例隔离（独立 graphId/清理数据）

## Action Items (Next Sprint)

1. 抽离 App.tsx：把视图管理/依赖编辑/历史管理下沉到 `@cdm/core-client`，Web 只保留壳与 UI 组合
2. 只读交互语义对齐：确认 readonly 是否允许“选中/高亮”；若允许，更新测试与交互策略
3. 下钻语义改进：引入“复用/重建”策略（或版本化子图 graphId），避免覆盖造成数据意外丢失
4. 测试并行化：每个测试使用独立 graphId 或在 setup/teardown 重置图数据，恢复并行执行能力

## References

- Sprint 状态：`docs/sprint-status.yaml`
- 故事产物：`docs/sprint-artifacts/1-1-*`、`docs/sprint-artifacts/1-2-*`、`docs/sprint-artifacts/1-3-*`

