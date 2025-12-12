# Repository Guidelines

## Project Structure & Modules
- Workspace: pnpm + turbo monorepo.  
- Apps: `apps/web` (Vite + React shell) ，`apps/api` (Fastify + plugin registry).  
- Packages: core/server/client/sdk/ui/utils/database，插件在 `packages/plugins/*`，预设 `packages/preset-default`。  
- Docs: `docs/`（PRD/架构/UX/epics、sprint 计划与状态）。Sprint 故事产物放 `docs/sprint-artifacts/`。  
- Tooling: `tooling/scripts/dev-all.sh` 一键启动前后端。

## Build, Test, Dev Commands
```bash
pnpm install                  # 安装依赖（根）
pnpm --filter @cdm/web dev    # 启动前端 Vite
pnpm --filter @cdm/api dev    # 启动后端 Fastify
pnpm --filter @cdm/api build  # 构建 API
pnpm --filter @cdm/web build  # 构建 Web
pnpm --recursive lint         # 运行所有包的 eslint
pnpm --recursive test         # 预留：添加测试后启用
./tooling/scripts/dev-all.sh  # 并行起 web+api（先安装）
```

## Coding Style & Naming
- 语言：TypeScript/React；模块路径用别名 `@cdm/*`（已在 `tsconfig.base.json` 设置）。  
- 格式化：Prettier（单引号、尾随逗号 es5）。Lint：ESLint + @typescript-eslint。  
- 命名：文件/包 kebab-case；故事文件 `docs/sprint-artifacts/<epic>-<story>-<slug>.md`；插件包名 `@cdm/plugin-*`。

## Testing Guidelines
- 当前无测试框架，请在新增时优先选择 Vitest（前端）与 Jest/Node 版（后端）或 Fastify 内建 hooks。  
- 测试命名：`*.spec.ts` / `*.test.ts`；放在与源码同级或 `__tests__/`。  
- 目标：关键路径（权限、水印、导出、协同）需最少一条集成用例；性能脚本放 `tooling/`。

## Commit & PR Guidelines
- Commit 消息参考历史：`feat: ...`、`chore: ...`、`fix: ...`；简洁说明改动焦点。  
- PR 建议包含：变更摘要、测试/验证说明、影响范围（前端/后端/插件）、相关文档或截图链接。  
- 避免将锁文件移除；保持 `pnpm-lock.yaml` 同步。

## Security & Config Tips
- 环境变量：不要提交 `.env*`；默认端口 web 5173 / api 4000。  
- 权限/水印/审计逻辑集中于 `packages/core-server` 与插件；改动需同步更新文档与审计说明。  
- 运行 API 若端口占用，先释放 4000 (`lsof -i :4000` / `kill <pid>`)。  

## Architecture Quick Notes
- “一切皆插件”：核心由 `@cdm/core-server` + 插件注册表；预设能力在 `@cdm/preset-default`。  
- 布局/协同/WS 入口在 `@cdm/core-client`，UI 组件在 `@cdm/ui`。  
- 数据存取抽象在 `@cdm/database`（当前为内存版，占位易扩展持久化）。
