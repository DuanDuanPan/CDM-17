---
title: Architecture — 脑图驱动协同研发平台（MVP + R18–R24）
date: 2025-12-12
owner: Enjoyjavapan
status: draft
scope: 支撑 PRD（R1–R24）与性能/安全基线（1k 节点、50 并发）
---

## 前端工程最佳实践（2025-12-13）
- 结构与分层：按功能分组（feature 下含 components/hooks/services/tests/styles）；跨功能的原子/复合/UI 组件放 `packages/ui`，工具放 `packages/utils`；禁止跨包相对路径引用，只用别名/包依赖。当前 workspace 示例：`apps/web/src/features/workspace/{components,hooks,views,model}`；入口 `apps/web/src/app.tsx` 仅负责选择 POC/Workspace。
- 单一职责：页面容器负责数据编排，呈现组件保持无副作用；跨视图采用懒加载，避免单文件过大。
- 状态与逻辑：数据获取/权限/埋点等逻辑下沉到自定义 hooks（如 useGraphData/useDependencies/useMetrics），必要时再升到 Context。
- UI 与样式（Tailwind）：统一在 `packages/ui` 封装 Button/Badge/Card/Input/Select 等基础组件；业务层少量 utilities 组合即可；workspace 避免使用 `.btn/.select` 这类局部 CSS 类。Tailwind 配置集中于根 `tailwind.config.cjs`，content 覆盖 apps/web 与 packages/ui，token（色板/圆角/阴影/spacing）统一维护；迁移期可关闭 preflight，完成后再评估开启统一 reset。
- 可测试性：组件/Hook 旁边放 Storybook/截图或 Vitest snapshot；可用 `/?poc=uikit` + `apps/web/tests/ui-kit.spec.ts` 做基础组件 smoke；大文件（>300 行）须拆分或附拆分计划。
- 依赖与流程：锁文件必提交；turbo/pnpm 任务声明 build 依赖 lint（见 `turbo.json`）；test 由具体工程选择（如 Playwright/Vitest），按需依赖 build；代码评审检查是否使用 `packages/ui` 组件、是否下沉逻辑为 hooks、文件尺寸/职责是否合理。

> 所有新故事/功能 DoR 必须确认上述原则适用并写入验收标准；代码评审按此检查。

## 1. 目标与范围
- 以脑图为单一真相源，覆盖需求/任务/审批/版本/权限/通知/导出/分享。
- 满足性能：1k+ 节点、50 并发；P95 交互 <100ms；协同 <200ms；导出 P95<3s；访问记录查询 P95<2s。
- 满足安全：密级/字段/附件权限，默认水印与敏感遮罩，审计可导出；分享需密级校验。
- 仅桌面 Web（本阶段不做移动等同体验）。

## 2. 总体架构（文本示意）
前端（Web） ←→ 实时层（WebSocket/RTC+节流） ←→ 后端服务层  
后端服务层：Graph / Execution / Permission-Security / Notification / Template-AI / Export / Share-Link / Audit-Visit / Layout / Command-Paste  
存储层：图数据（文档型+图索引）、任务/依赖、版本快照、审计&访问记录（append-only）、对象存储（附件）、缓存（热节点/会话）、搜索索引（标签/文本）、导出工件存储（临时）。

## 3. 关键组件与职责
- Graph Service：节点/关系/版本/跨图引用/标签/搜索；支持子图下钻快照。
- Execution Service：任务映射、FS/SS/FF/SF 依赖、定期任务、审批后推演下一任务。
- Permission & Security Gateway：密级判定、字段/附件 ACL、临时提升审批、水印策略、审计写入。
- Notification Service：站内信去重+5分钟汇总+优先级实时；收件箱过滤；@mention 推送。
- Template & AI Service：模板库、子树片段、AI 骨架生成/扩展；模板可预置必填字段与默认密级。
- Layout Engine（前端优先 + 后端持久化接口）：自由/树/逻辑统一布局，对齐/吸附/网格/距离计算，布局状态持久化。
- Command & Paste Engine：/命令面板；文本/表格→树解析预览；AI Skeleton 调用模板/Graph。
- Export Service：多格式（PDF/PNG/Word/Markdown/纯文/ZIP），支持水印/敏感遮罩、范围裁剪、分片重试，写审计。
- Share & Link Manager：生成/失效链接，校验密级，默认水印，记录访问事件。
- Audit & Visit Log：append-only 存储，过滤导出 CSV/JSON；独立监控与告警。
- Realtime Hub：WebSocket/RTC，事件压缩+节流（对齐通知策略），支持多人光标/评论/锁定/冲突提示。

## 4. 数据与存储
- 图数据：文档型（节点属性、版本快照）+ 图索引（父子、依赖、跨图引用）。支持子图快照/回链。
- 版本与快照：关键操作增量存储；时间线支持差异与回滚。
- 审计/访问记录（决策闭环 2025-12-12）：append-only；字段包含 event_id(UUID)、project_id、graph_id、node_id(optional)、resource_type(graph/node/export/share)、resource_level、subject_user_id、subject_level、action(view/edit/download/export/share_create/share_visit/share_invalidate)、channel(web/ws/api/share_link)、result(allow/deny)、ip（30 天后哈希）、ua_fingerprint(hash)、ts_ms、latency_ms、request_id、client_version；热存储 90 天可查询，冷存储 12 个月（S3/对象存储），TTL 400 天；索引 (graph_id, ts desc)、(project_id, ts desc)、(action, ts)、(resource_level, ts)，所有查询必须带 project_id + 时间窗。
- 搜索索引：节点文本/标签/类型；支持密级过滤。
- 导出缓存：短期存储生成的文件（含水印/遮罩元数据）。
- 权限元数据：密级、字段/附件 ACL、继承+局部覆盖策略。

## 5. 关键流程（简版）
1) 快速建图（R23）：用户 `/` → 命令面板 → 选择“粘贴成树” → 预览 → 写 Graph → Layout 持久化；若 AI 骨架则调用 Template/AI。
2) 模板/片段（R19）：模板服务返回结构/必填/默认密级；权限网关校验；插入节点并写版本；失败提示申请提升。
3) 协同可见性（R20）：前端显示光标/选中；评论线程 + @mention 事件进入 Notification，遵循 5 分钟去重/汇总；未读状态由收件箱维护。
4) 导出（R21）：前端选择格式/范围/水印/遮罩→ Export Service 生成 → 审计记录 → 临时存储 → 下载链接；超时分片重试；遮罩节点 >500 时提示降级（结构-only 或选中子树）。
5) 分享（R24）：创建链接前校验密级；默认水印+遮罩不可关闭；默认有效期 7 天（可调 1–30 天）；资源密级≥机密禁用公开链接；访问事件写 Audit/Visit Log；失效操作即时更新并返回 41001。
6) 访问记录（R22）：右侧面板查询 Audit/Visit Log，支持时间/事件/密级过滤；导出 CSV/JSON；超时走分页。
7) 自由布局（R18）：前端计算对齐/吸附/网格；布局状态写 Layout 存储；切回树/逻辑时保留节点位置映射。

## 6. 非功能设计要点
- 性能：视口分片渲染、关系线裁剪、增量协同消息；导出异步+分片；访问记录分页查询。
- 可靠性：审计 append-only + 重试队列；导出/分享操作可重放；布局/版本快照便于回滚。
- 安全：水印默认开启且分享/导出不可关闭；无权限字段/附件强制遮罩；分享强制密级校验（默认 7 天有效期，机密及以上禁用公开链接）；审计/访问记录可导出；IP/UA 30 天后哈希。
- 可观测性：前端埋点（FPS/交互耗时/导出耗时/分享生成耗时/访问记录查询耗时）；后端指标（队列延迟、冲突率、通知去重命中率、导出成功率、审计写入延迟）。

## 7. 技术选择（建议）
- 前端：React + 状态管理（如 Zustand/Redux），Canvas/WebGL 混合绘图；WebSocket 实时通道。
- 服务：Node/TypeScript 或 Go 微服务；事件总线（Kafka/NATS）支撑审计与通知；文档 DB（Mongo/DocumentDB）+ 图索引（Neo4j/JanusGraph/Arango Graph）；对象存储（S3 兼容）。
- 导出：基于 headless Chrome/Playwright 生成 PDF/PNG；Markdown/纯文/ZIP 由服务侧拼装。
- 权限：Policy Engine（OPA 或自研 ACL），密级与字段/附件规则在策略层评估。

## 8. 风险与缓解
- 大图性能：采用视口分片、关系线裁剪、渲染性能监测，压测脚本 Script-P1/P2 覆盖 1k 节点与 50 并发协同。
- 导出/分享泄露：默认水印+敏感遮罩不可关闭；分享需密级校验（默认有效期 7 天，资源密级≥机密禁用公开链接）；失效入口显式；审计/访问记录可追溯。
- 导出超时：分片/重试，遮罩节点 >500 时提示降级为结构-only 或子树导出。
- 审计可靠性：append-only + 重试；查询分页防超时；监控写入延迟；IP/UA 30 天后哈希化降低隐私风险。
- 冲突与协同：保持人为合并；提供冲突提示与锁；未来可评估半自动合并。

## 9. 决策状态（2025-12-12）
- 已闭环：访问记录数据模型/索引/留存与脱敏；分享默认策略（强制水印遮罩、默认 7 天、机密及以上禁用公开）；导出范围与遮罩冲突降级；模板版本化与回滚流程；压测脚本与指标；未读计数单一来源与错误码。
- 待后续：字段/附件继承策略细化；跨图血缘粒度与冲突处理（占位，不阻塞当前迭代）。

## 10. 里程碑对齐（R18–R24）
- M1：交互与验收定稿；组件选型。
- M2：实现自由布局基础、协同可见性+@节流、快速上手；导出/分享/审计骨架与性能基线。
- M3：模板/片段库、导出水印遮罩、访问记录视图、分享联动完善；自由布局持久化与细节打磨。
