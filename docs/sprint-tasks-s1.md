---
title: Sprint 1 Task Breakdown
date: 2025-12-12
owner: Enjoyjavapan
status: draft
source_plan: docs/sprint-plan.md
---

## 范围对齐
- 目标：交付桌面端脑图协同 MVP，覆盖基础权限/水印、通知节流、自由布局、导出/分享与访问记录写入。
- 依据：`docs/prd.md`、`docs/ux-design.md`、`docs/architecture.md`、`docs/epics-and-stories.md`、`docs/test-design.md`、`docs/implementation-readiness.md`。

## DoR / DoD 提示
- DoR：需求已在 PRD/架构中明确；接口契约有草图；依赖已列出；验收标准可测。
- DoD：代码过单测/静态检查；关键路径有 e2e/集成验证；性能/安全指标达标；文档与审计记录更新。

## 任务清单（按领域）
- 数据与权限  
  - S1-ACL-01：最小图模型/版本/快照落库；保存/查询 API。  
  - S1-ACL-02：权限网关 + 默认水印；校验节点/字段/附件权限。  
  - S1-AUD-01：审计写入管线；失败重试与告警。
- 画布与视图  
  - S1-CAN-01：脑图绘制（树/逻辑）+ 自由布局基础（吸附/网格开关）。  
  - S1-CAN-02：节点下钻/回链；粘贴为树；快捷命令面板。
- 任务与审批  
  - S1-FLOW-01：节点→任务映射；FS/SS 依赖。  
  - S1-FLOW-02：审批通过驱动后续任务状态推进（简版）。
- 协同与通知  
  - S1-COL-01：实时光标/选中同步；WS 心跳/重连。  
  - S1-NOTI-01：评论线程 + @mention；通知节流策略。
- 导出与分享  
  - S1-EXP-01：PDF/PNG 导出（默认水印，全图/子树）。  
  - S1-SHARE-01：只读分享链接；密级校验；失效按钮；访问记录写入。
- 性能与观测  
  - S1-PERF-01：1k 节点基线数据集与压测脚本。  
  - S1-OBS-01：前端埋点（FPS/交互）；后端队列监控仪表。

- UI 与样式（Epic E1）  
  - S1-UI-01：Tailwind 接入 spike（讨论/PoC）。  
  - S1-UI-02：Tailwind bootstrap（安装配置、token 定义）。  
  - S1-UI-03：Tailwind batch1 组件迁移（按钮/卡片/输入）。

## 导入用 CSV（示例，可贴到看板）
```csv
ID,Title,Area,Priority,Owner,Due,Acceptance
S1-ACL-01,图模型/版本/快照最小实现,数据与权限,P1,,,接口可存取节点/版本/快照
S1-ACL-02,权限网关+默认水印,数据与权限,P1,,,未授权访问被拒且默认水印生效
S1-AUD-01,审计写入管线,数据与权限,P1,,,99%+写入成功率且有告警
S1-CAN-01,脑图绘制+自由布局基础,画布与视图,P1,,,支持树/逻辑图与吸附/网格
S1-CAN-02,下钻/回链+粘贴树+/命令,画布与视图,P2,,,
S1-FLOW-01,节点→任务映射+FS/SS,任务与审批,P1,,,
S1-FLOW-02,审批驱动任务推进,任务与审批,P2,,,
S1-COL-01,实时光标/选中+WS重连,协同与通知,P1,,,
S1-NOTI-01,评论/@mention+节流,协同与通知,P2,,,
S1-EXP-01,PDF/PNG导出(默认水印),导出与分享,P1,,,
S1-SHARE-01,分享链接+密级校验+失效,导出与分享,P1,,,
S1-PERF-01,1k节点压测脚本,性能与观测,P1,,,
S1-OBS-01,前端埋点+后端队列监控,性能与观测,P1,,,
S1-UI-01,Tailwind接入spike,UI与样式,P2,,,
S1-UI-02,Tailwind bootstrap,UI与样式,P1,,,
S1-UI-03,Tailwind batch1组件迁移,UI与样式,P1,,,
```

## 后续动作
- 填充 Owner/截止日期并导入看板；若需我批量生成 Jira/YouTrack/Trello 模板，请提供工具/字段要求。
