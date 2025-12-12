---
title: Architecture Skeleton Plan — 基于 NocoBase 插件化思路
date: 2025-12-12
owner: Enjoyjavapan
status: draft
---

## 参考要点（NocoBase）
- Monorepo + Workspaces，前后端同仓；核心与插件分层，预设包便于安装。
- “一切皆插件”微内核：核心负责运行时、权限、资源、事件；业务能力以插件装配。
- 前端/后端各有核心包（client/server），共享类型与工具。

## 推荐骨架（pnpm + turbo）
```
.
├─ apps/
│  ├─ web/            # React + Vite（桌面端），布局壳：顶栏/左侧/画布/右侧/通知
│  └─ api/            # Koa/Fastify 服务网关，插件加载、ACL、水印、审计
├─ packages/
│  ├─ core-client/    # 画布/视图管理/协同/布局状态，WS 连接器
│  ├─ core-server/    # 应用/插件生命周期、权限、水印、审计、事件总线
│  ├─ database/       # 图+文档混存抽象；节点/版本/关系/快照；访问记录存储
│  ├─ sdk/            # Web/Node HTTP/WS SDK，统一鉴权/节流/重试
│  ├─ ui/             # 设计体系与共用组件（水印条、访问记录面板、对齐控件）
│  ├─ types/          # TS 类型：Node/Edge/Version/ACL/Task/Export/Share/AuditEvent
│  ├─ utils/          # 通用工具（节流/分片/重试/格式化）
│  ├─ preset-default/ # 预装插件集合（权限、审计、通知、导出、分享、模板、AI骨架、自由布局）
│  └─ plugins/
│     ├─ plugin-permission/
│     ├─ plugin-audit-log/
│     ├─ plugin-notification/
│     ├─ plugin-export-share/
│     ├─ plugin-template-ai/
│     └─ plugin-layout-free/
├─ tooling/
│  ├─ eslint-config/
│  ├─ tsconfig/
│  └─ scripts/        # lint/test/build/dev/seed
└─ docs/              # 现有文档继续
```

## 核心职责映射
- core-server：应用生命周期、插件注册/启停、ACL/密级/字段/附件、水印策略、审计写入、事件总线、导出/分享策略钩子。
- core-client：视图/状态容器（脑图/甘特/时间轴/看板）、协同通道包装、快捷命令、粘贴解析器、自由布局控制条。
- database：节点/关系/版本/快照 + 图索引；访问记录 append-only；对象存储适配。
- sdk：REST/WS 客户端封装，错误码与重试策略统一。
- plugins：按 PRD R18–R24 解耦，便于裁剪和并行开发。
- preset-default：开箱即用的能力集合。

## 技术栈建议
- Workspace：pnpm + turbo。
- 前端：React 18 + Vite；状态（Zustand/Redux）；协同 WS/RTC；Playwright + Vitest。
- 后端：Node/TS + Koa/Fastify；ACL/OPA；事件队列（Kafka/NATS 可选）。
- 存储：文档 DB（Mongo）+ 图索引（Neo4j/Arango）+ 对象存储（S3 兼容）；审计/访问记录 append-only。
- CI：turbo pipeline（lint/test/build）、lint-staged+husky；.env.example、docker-compose.dev。

## 最小落地步骤（可作为 M0/M1 前的脚手架）
1) 初始化 workspace（pnpm + turbo + tsconfig.base + eslint/prettier）。
2) apps/web：Vite+React 空壳（顶栏/左侧/画布/右侧/通知抽屉）；WS/HTTP client stub。
3) apps/api：Koa/Fastify 空服务；健康检查；插件注册器 stub。
4) packages/types：定义 Node/Edge/Version/ACL/Task/Export/Share/AuditEvent/VisitLog 基础接口。
5) packages/core-server：加载插件、权限中间件、水印/审计 hook stub。
6) packages/core-client：视图管理与协同连接 stub，自由布局状态模型占位。
7) packages/sdk：HTTP/WS 封装与错误码。
8) tooling：eslint-config、lint-staged、husky、vitest/playwright 基础。

## 与现有规划对齐
- 符合 PRD/架构的插件化拆分（R18–R24 分包）。
- 保留导出/分享/访问记录/权限等钩子点，便于安全与性能策略落地。
- 方便并行开发与后续拆分部署。
