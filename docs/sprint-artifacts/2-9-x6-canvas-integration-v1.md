# Story 2.9: x6-canvas-integration-v1 (Epic E2)

Status: in-progress

## Story
作为用户，我希望工作区“脑图画布”使用统一的图编辑引擎（X6）实现节点卡片与连线编辑，从而为后续的对齐/吸附/网格、依赖编辑、多视图同步等能力打底，同时保持现有核心行为不回退。

## 目标
- 将 X6 画布从 PoC 推进到“可替换默认脑图视图”的 v1（仍可保留 feature flag 以渐进发布）。
- 与现有数据模型/交互保持一致：选中、只读限制、下钻/回链、依赖关系展示与编辑入口。

## Acceptance Criteria
1. 默认脑图视图可切换到 X6（feature flag 控制）；旧实现可保留作为 fallback。
2. 选中/只读/下钻回链行为与现有一致（至少通过现有 Playwright 用例集的关键子集）。
3. 依赖关系线（relation/类型/样式）在画布中有最小可视表达，并且不破坏右侧依赖面板的编辑逻辑。
4. 性能基线：1k 节点下，缩放/拖拽/切换视图的体验无明显卡顿（记录一次粗测数据）。

## 开发前置（准备清单）
- 契约对齐：GraphSnapshot ←→ X6 字段映射（node/edge，含 relation/dependencyType、updatedAt、readonly），边 `id` 必填且唯一（与后端接口一致）。
- 切换策略：确定 feature flag 入口与默认值，保留旧画布 fallback/回滚路径。
- 设计对齐：依赖线最小可视表达（颜色/箭头/标签）与右侧依赖面板同步规则；只读模式的禁用矩阵（移动/连线/编辑）。
- 测试计划：列出需保持稳定的 Playwright 用例子集（选中、只读、依赖编辑、下钻/回链）；确定 1k 场景粗测脚本与指标记录格式（可复用 2-8 的 perf spec 变体）。
- 数据准备：提供含依赖关系的真实/仿真 GraphSnapshot（含 1k 数据集，以及多层下钻示例）供开发与性能验证。

## Tasks
- 数据映射：GraphSnapshot ↔ X6 cells（含 relation/depends-on 等边属性映射）。
- 交互一致性：选中同步、readonly 禁止编辑、面包屑下钻/回链联动。
- 兼容测试：调整/补充 Playwright 用例（最小变更），保证关键链路稳定。
- 性能与稳定性：1k 节点场景验证 + 记录。

## 前端最佳实践（强制）
- 渐进发布：保留 feature flag + fallback；默认行为不变。
- API/状态兼容：尽量复用现有 hooks 与数据模型，不引入“平行状态源”；保持单一真相源（GraphSnapshot）。
- 可测试性：优先通过稳定的 data-testid/role 选择器维持 e2e；对必要的 DOM 结构变更做最小化调整。
- 性能预算：控制重渲染与 DOM 数量；明确缩放级别下的渲染策略；记录可复现的基线数据。
