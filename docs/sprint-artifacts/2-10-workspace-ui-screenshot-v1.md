# Story 2.10: workspace-ui-screenshot-v1 (Epic E2)

Status: drafted

## Story
作为用户，我希望工作区整体 UI（顶部栏/左侧项目列表/右侧 inspector）升级为截图同款的信息架构与视觉风格，使产品看起来更“可交付”，同时不改变现有功能行为。

## UI 范围（对照截图）
- 顶部：工作区标题 + 视图切换（脑图/甘特/时间轴/看板）+ 用户/通知入口。
- 左侧：项目列表（密级标识、节点数/成员数等信息）、滚动与选中态。
- 右侧：Inspector（tab：属性/版本/依赖/AI 等），表单控件风格统一（下拉、输入、进度条、标签）。

## Acceptance Criteria
1. 工作区整体布局与截图同类（信息架构一致）：top/left/right 三栏可用，响应式不崩。
2. 组件风格统一：按钮/输入/卡片/徽标等使用 `@cdm/ui` + Tailwind token，focus/hover 状态清晰。
3. 不回退现有功能：至少通过现有 Playwright 核心用例（切视图、只读、依赖编辑、撤销重做等关键路径）。

## Tasks
- 结构：重做 WorkspaceShell 布局（top/left/main/right）与基础导航区块。
- 样式：用 Tailwind token 统一 spacing、border、shadow、radius；补齐必要的基础 UI（分段切换、tabs、icon 按钮等）。
- 适配：保证现有页面/测试用例最小改动通过；必要时新增 `?poc`/feature flag 以渐进迁移。

## 前端最佳实践（强制）
- 组件复用：优先使用 `@cdm/ui`，缺失的基础组件先在 feature 内做 thin-wrapper，待稳定后再回收进 `packages/ui`。
- 样式治理：禁止新增全局 reset/污染性选择器；样式尽量收敛在 workspace feature scope 或 Tailwind utilities。
- 可访问性：Tabs/切换/按钮/表单控件需可键盘操作，focus 状态可见；左右侧栏可滚动且不遮挡主交互。
- 回归保障：至少跑过现有 Playwright 核心用例；必要时新增一个“工作区 UI 外观”截图用例。
