# Story 2.8: x6-canvas-ui-spike (Epic E2)

Status: done

## 背景 / 目标
目标是在不牺牲 PRD 的“图形操作能力”和性能指标前提下，把工作区画布与整体界面升级到截图类似的产品化质感，并产出明确的技术选型与迁移路径。

对齐 PRD（关键条目）：
- 画布交互：拖拽/批量、自由模式对齐/吸附/网格开关、折叠/展开、下钻子图、关系线方向/标签/颜色（见 `docs/prd.md`“画布交互”）。
- 性能：1k 节点交互 P95 < 100ms（见 `docs/prd.md` R1 / R18 / R8 指标）。

## Spike 范围（本 Story 要完成）
### 1) 画布引擎 PoC
- 选择 `AntV X6 + @antv/x6-react-shape` 作为画布引擎候选，落地一个可运行的 PoC。
- 用现有 GraphSnapshot（nodes/edges）做最小映射，跑通：渲染、选中、拖拽、缩放/平移、连线（最小可编辑）。

### 2) UI 视觉还原 PoC（截图同款风格）
- 目标是“风格接近 + 信息架构一致”，不追求像素级完全一致。
- 必含：顶部工作区栏 + 视图切换胶囊、左侧项目列表、右侧 inspector（tab + 表单控件）。
- 组件实现基于 Tailwind + `@cdm/ui`（必要时补齐缺失的基础组件，但不在本 Story 里强制落地成通用组件库）。

### 3) 可行性结论与迁移计划
- 给出 go/no-go 结论：继续 X6、改用其他（如 React Flow）、或保留现有 canvas。
- 明确迁移路径（分阶段）、风险清单、回滚策略、对现有 e2e 测试影响面。

## 非范围（本 Story 不做）
- 不将 PoC 直接替换为默认工作区入口（可通过 feature flag / query 参数开启）。
- 不一次性实现 PRD 中所有高级操作（/命令面板、粘贴表格生成树、多人光标、锁定/冲突合并等）。
- 不做完整的导出/分享/审计链路联动（只需保证不阻塞未来接入）。

## 验收标准（Acceptance Criteria）
1. 提供一个可开关入口（示例：`/?poc=x6` 或 `/?canvas=x6`），可展示 X6 画布 PoC（不影响默认路径）。
2. X6 画布具备最小交互闭环：缩放/平移、节点选择、节点拖拽、多选（框选或按键多选二选一）、最小连线创建/编辑。
3. UI PoC 在同一入口下可见：顶部栏 + 视图切换、左侧项目列表、右侧 inspector（tab + 表单），整体风格与截图同类。
4. 性能/体积记录：在 1k 节点数据集下做一次交互基线记录（至少包含：首屏渲染耗时、缩放/拖拽平均耗时或 P95 粗测），并记录 bundle size 变化（build 输出）。
5. 产出结论：在本文件中补齐“选型结论 / 风险 / 迁移计划 / 回滚策略”。

## 任务拆解（建议）
- Research：对比 X6 vs React Flow vs 继续 canvas（能力覆盖、复杂度、license、性能风险、可维护性）。
- PoC：接入 X6（含 react-shape），用现有数据渲染节点卡片与连线。
- UI PoC：按截图搭出壳（top/left/right），节点卡片与右侧表单样式打通。
- 验证：补一个最小 Playwright 冒烟（入口可打开、组件可见），生成 2~3 张截图作为证据。
- 性能/体积：记录 build 产物 gzip 体积变化；给出 1k 节点交互粗测结论。

## 现有资产（可复用）
- 入口与路由：`apps/web/src/app.tsx` 已支持 `?poc=tailwind|uikit`；建议沿用新增 `?poc=x6`（或 `?canvas=x6`）。
- 画布现状：`apps/web/src/features/workspace/views/mindmap-canvas.tsx` + `apps/web/src/features/workspace/hooks/use-mindmap-render.ts`。
- 1k 节点数据集：`apps/web/src/features/workspace/services/graph-snapshot.ts` 的 `seedGraphSnapshot(1000)`。
- UI 基础组件：`packages/ui/src/components/*`（Button/Card/Input/Select/Badge）。
- 自动化基线：Playwright 配置 `apps/web/playwright.config.ts`；截图/快照模式可参考 `apps/web/tests/ui-kit.spec.ts`。

## 需求清单（从 PRD 抽取 → Spike 取舍）
| 能力 | PRD 对齐点 | Spike 必须 | 说明 |
| --- | --- | --- | --- |
| 节点卡片（富 UI） | 画布交互 | ✅ | 用 React node shape 实现截图风格卡片 |
| 连线（方向/样式） | 画布交互（方向/标签/颜色） | ✅（最小） | 先保证方向/类型样式，标签/颜色可按需简化 |
| 选中 | R1（选中保持） | ✅ | 与右侧面板联动（只需最小） |
| 多选（框选或按键） | 画布交互（批量） | ✅ | 二选一即可通过 AC |
| 拖拽节点 | 画布交互（拖拽） | ✅ | readonly 时禁用 |
| 缩放/平移 | R1（缩放） | ✅ | 需有体验基线记录 |
| 网格/吸附开关 | R18（对齐/吸附/网格） | ✅（基础） | Spike 只做开关与最小生效，不追求完备 |
| 对齐线/距离指示线 | R18 | ❌ | 作为风险项评估 + v1 计划 |
| 折叠/展开 | 画布交互 | ❌ | Spike 可只展示 folded 状态或不实现 |
| 下钻子图/面包屑 | 画布交互（下钻回退） | ❌ | Spike 只保留入口/占位（不实现逻辑） |
| /命令面板、粘贴成树预览 | 画布交互（命令/粘贴） | ❌ | 不在本 Spike，避免扩 scope |
| 协同光标/锁/冲突合并 | 协同与权限 | ❌ | 不在本 Spike |

## DoR / Validation（2025-12-14）
- 依赖就绪：Tailwind 与 token 已落库（2-5 done），基础组件已迁移（2-6 done），前端结构按 feature 拆分（2-7 done）。
- 入口策略：必须以 feature flag / query 参数启用，不影响默认工作区；保留旧画布 fallback。
- 验证方案：
  - 自动化：新增最小 Playwright 冒烟（建议 `apps/web/tests/x6-spike.spec.ts`），并产出 2~3 张截图/快照作为证据。
  - 性能：用 `seedGraphSnapshot(1000)`，记录首屏渲染耗时 + 缩放/拖拽的粗测数据（至少 20 次样本，给出 P95 或平均值）。
  - 体积：记录 `pnpm --filter @cdm/web build` 的 gzip CSS/JS 增量，并写入本 Story。
- 风险与回滚：
  - 风险：富节点（DOM/React）导致性能退化 → 策略：LOD/视口渲染/合帧；必要时缩放级别降级为简化节点。
  - 风险：依赖体积增长/冲突 → 策略：仅引入画布必需依赖，记录增量，随时可移除并回退到旧画布。
  - 风险：e2e 不稳定 → 策略：使用 data-testid/role 等稳定选择器，减少动画依赖。
- Owner: bob（建议）；Due: 2025-12-26；SP: 5。

## 前端最佳实践（本 Spike 强制要求）
- 渐进式引入：必须通过 feature flag / query 参数启用，不影响默认路径；保留 fallback。
- 架构边界清晰：X6 适配层（GraphSnapshot ↔ X6）与 UI/业务逻辑解耦，避免把 X6 类型泄漏到业务层。
- 代码组织：新增代码按 `apps/web/src/features/*` 分层落位；禁止把 PoC 逻辑散落在全局入口或无关目录。
- 可访问性：交互控件与表单保持可聚焦、可键盘操作，focus 状态清晰；不使用仅颜色传达关键信息。
- 性能策略：对 1k 节点启用必要的降级/LOD（缩放级别细节、视口内渲染等）以避免 DOM 爆炸；交互事件节流/合帧（`requestAnimationFrame`）。
- 可观测性：关键交互（首屏渲染、缩放、拖拽）必须可记录（沿用现有 telemetry 或新增最小埋点）。
- 测试与证据：最小 Playwright 冒烟 + 截图证据；选择稳定选择器，避免依赖易变文案。
- 依赖治理：确认 license（优先 MIT）与依赖体积；保持 lockfile 一致；避免引入重型 UI 框架。

## 交付物（Deliverables）
- 可切换的 X6 画布 PoC + 截图同款风格 UI PoC。
- 本文件补齐：选型结论、风险清单、迁移计划、回滚策略、性能/体积记录、验证记录。

## 实现与验证记录（2025-12-14）
### 代码落地
 - 入口（feature flag）：`apps/web/src/app.tsx` 使用 `?poc=x6`，独立入口不影响默认路径。
- UI 壳：`apps/web/src/features/workspace-x6/x6-workspace-page.tsx`（top/left/main/right）。
- 画布：`apps/web/src/features/workspace-x6/components/x6-canvas.tsx`（Selection/Snapline、连线模式、1k LOD、性能粗测 HUD）。
- 节点卡：`apps/web/src/features/workspace-x6/components/x6-node-card.tsx`（`@cdm/ui` Badge 风格）。
- Demo 数据：`apps/web/src/features/workspace-x6/model/demo-snapshot.ts`。

### 依赖与 License
- `@antv/x6@3.1.2` License: MIT（本地 `package.json` 校验）。
- `@antv/x6-react-shape@3.0.1`（用于富节点 React 渲染）。
- `tslib`：X6 的 ESM 产物在 Vite build 下需要运行时依赖（否则 Rollup resolve 失败）。

### 自动化与截图证据
- 冒烟 + 截图：`apps/web/tests/x6-spike.spec.ts`（快照在 `apps/web/tests/x6-spike.spec.ts-snapshots/`）。
- 性能粗测（1k）：`apps/web/tests/x6-perf.spec.ts`（打印 HUD 文本，便于粘贴到本 Story）。

### 验证命令（本机执行结果）
- `pnpm --filter @cdm/web lint`：通过。
- `pnpm --filter @cdm/web test -- tests/x6-spike.spec.ts`：通过（含 3 张 element screenshot）。
- `pnpm --filter @cdm/web test -- tests/x6-perf.spec.ts`：通过；示例输出：
  - `数据集：1k · 首屏渲染≈413.1ms · 缩放P95≈37.1ms · 移动P95≈22.4ms`（Playwright Chromium headless，dev server，粗测仅供参考，数值会随机器/负载波动）。
- `pnpm --filter @cdm/web build`：通过；产物（gzip）：
  - `assets/index-*.js`：202.13 kB（gzip 63.55 kB）
  - `assets/x6-workspace-page-*.js`：597.71 kB（gzip 172.83 kB）
  - `assets/index-*.css`：15.55 kB（gzip 3.64 kB）

## Code Review（写入 Story + 依次修复）
> 目标：把 PoC 的“可运行”升级到“可演进”，避免后续 2-9/2-10 在性能、可维护性、状态一致性上踩坑。

### High（必须修复）
1) Graph 生命周期：避免重复创建/销毁
- 现状：`apps/web/src/features/workspace-x6/components/x6-canvas.tsx` 会在 `connectMode/gridEnabled/snapEnabled/readonly/回调` 等变化时重建 Graph。
- 风险：事件重复绑定/性能浪费；放大 `@antv/x6-react-shape` 在 dev/StrictMode 下的 warning；未来接入协同/审计更难定位问题。
- 修复方向：Graph 仅初始化一次；用 `ref` 保存最新 props；把 “toggle grid/snap/readonly/connectMode” 拆成独立 effect 更新行为。

2) Snapshot 更新策略：避免全量 clear/rebuild；保留视口；位置回写
- 现状：snapshot 变化即 `clearCells()` + 重建所有 cells + `centerContent()`。
- 风险：视口/缩放频繁跳动；拖拽位置无法稳定落库（后续任何更新会把节点拉回）；1k 节点时更新成本不可控。
- 修复方向：
  - 仅在首次加载或“数据集切换”时 `centerContent()`；普通更新保留 viewport。
  - 节点拖拽后监听 `node:moved`（或合适事件）把 position 回写到上游 snapshot（单向数据源一致）。
  - 结构不变时做增量更新（更新 node data/position、edge attrs），必要时再重建。

### Medium（建议修复）
1) 选择态同步更完整
- 现状：`selection:changed` 只在 `ids.length > 1` 设置 multi，单选/清空时状态回落不够明确。
- 修复方向：把 selection state 统一归一化（none/single/multi），避免 UI 侧出现残留状态。

2) `onPerfMeasured` 语义落地
- 现状：`X6CanvasProps` 里存在 `onPerfMeasured` 但未使用。
- 修复方向：要么接上性能测量回调（让外部记录/展示），要么删除该 prop（避免误导）。

### 后续新增高/中建议（复审 2025-12-14）
- High：demo 富节点更新仍全量 `setData`（`x6-canvas.tsx`）→ 应基于 `updatedAt/hash` 做 diff，仅变更节点触发 setData，避免 React shape 重绘放大。
- High：内部同步建议使用 `graph.batchUpdate` + `{ silent: true }` 包裹增量写入，并替代 `suppressPositionSyncRef` 方案，以降低事件噪声、便于未来协同/审计接入。
- High：edge id 生成可能冲突（无 id 时用 `e-${from}-${to}`）→ GraphSnapshot 层需保证唯一、稳定 id，支持同对多边。
- Medium：connectMode 下 Selection 仍可框选/高亮，建议模式切换时禁用 rubberband 或明确 UI 状态，避免误操作。
- Medium：位置回写当前 O(N) map（`x6-workspace-page.tsx`），若改为实时回写需节流/局部更新。
- Medium：文档现描述 “`onPerfMeasured` 未使用” 已过时，需同步更新（本条即为自更正）。

### 修复记录（2025-12-14）
- [x] H1 Graph 仅初始化一次：`apps/web/src/features/workspace-x6/components/x6-canvas.tsx` 用 refs 持有最新 props/回调，避免 connectMode/grid/snap/readonly 变化导致重建。
- [x] H2 增量同步 + 保留视口：snapshot 更新不再全量 clear/rebuild；仅首次/数据集切换时 `centerContent()`；拖拽后通过 `node:moved` 回写 position 到上游（`apps/web/src/features/workspace-x6/x6-workspace-page.tsx`）。
- [x] M 选择态归一化：`selection:changed` 覆盖 none/single/multi，避免残留 multi 状态（connectMode 下避免干扰连线流程）。
- [x] M 删除无效 prop：移除未使用的 `onPerfMeasured`，避免误导调用方。
 - [x] 增量 diff + 静默批量：富节点 `setData` 在 `updatedAt`/fields/坐标变化时触发，节点/边增删改包裹 `graph.batchUpdate(...,{silent:true})`，connectMode 下禁用橡皮筋框选。
 - [x] 边 ID 稳定：GraphSnapshot 层强制 edge.id（seed/demo/前端创建均补齐），canvas 检测缺失/重复 id 直接抛错，移除 fallback，确保顺序不影响增量更新。
- [x] 验证：`pnpm --filter @cdm/web lint`、`pnpm --filter @cdm/web test -- tests/x6-spike.spec.ts`、`pnpm --filter @cdm/web test -- tests/x6-perf.spec.ts`。

## 选型结论（Go / No-Go）
结论：**Go，继续使用 AntV X6** 作为 2-9/2-10 的落地引擎。

理由（对齐本 Spike 的证据）：
- PRD 关键交互（缩放/平移、选择/多选、拖拽、连线、网格/吸附）可在 X6 上以插件/配置方式快速覆盖，并保持可扩展性。
- 1k 节点在“简化节点（LOD）”模式下交互 P95 在粗测中可控制在 < 100ms（见上方记录），具备继续优化空间。
- 通过 `React.lazy` 实现按需加载，降低对默认路径的 bundle 影响与回滚成本。

## 风险清单与回滚策略
- 风险：`@antv/x6-react-shape` 在 dev/StrictMode 下可能出现 React warning（不影响功能但会污染控制台）→ 策略：prod 再评估；必要时在 v1 降低 React shape 使用范围（仅小规模/视口内），或换成轻量节点渲染。
- 风险：富节点（DOM/React）在 1k 场景性能退化 → 策略：LOD/按缩放级别切换节点形态、减少 DOM、视口内渲染。
- 回滚：默认工作区仍走旧入口；移除 `?poc=x6` 相关代码/依赖即可回退，不影响主流程。

## 迁移计划（对齐后续 Story）
- 2-9：做 X6 适配层与现有数据/交互对齐（GraphSnapshot ↔ X6、选择/编辑/连线、关键 PRD 操作逐步补齐），继续保留 fallback。
- 2-10：把工作区 UI 按截图风格系统化（top/left/right 细节、inspector tabs/表单规范、图标体系/一致性）。

## BMad-method 检查点（用于推进到 ready-for-dev）
- [x] 需求对齐：明确“必须实现/可延后”的图形操作能力清单（从 PRD 抽取）。
- [x] 方案对齐：选型与架构边界（画布引擎 vs 业务层工作流）。
- [x] 验证方案：性能基线与最小自动化验证（Playwright）。
- [x] 风险与回滚：明确 fallback（保留旧画布/双轨运行/feature flag）。
