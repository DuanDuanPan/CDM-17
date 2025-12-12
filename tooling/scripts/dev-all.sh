#!/usr/bin/env bash
set -euo pipefail

# 一键启动 web 与 api（需先 pnpm install）
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm 未安装，请先安装 pnpm" >&2
  exit 1
fi

pnpm install
pnpm --filter @cdm/api dev &
pnpm --filter @cdm/web dev &
wait
