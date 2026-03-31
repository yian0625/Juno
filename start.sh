#!/bin/bash

# Juno Frontend Start Script
# 用法:
#   ./start.sh          # 本地开发 (读取 env.local.json)
#   ./start.sh -dev     # 开发环境 (读取 env.dev.json)
#   ./start.sh -prod    # 生产环境 (读取 env.prod.json)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 根据参数选择环境配置文件
ENV_MODE="local"
RUN_MODE="dev"

case "$1" in
    -prod)
        ENV_MODE="prod"
        RUN_MODE="prod"
        ;;
    -dev)
        ENV_MODE="dev"
        RUN_MODE="dev"
        ;;
    *)
        ENV_MODE="local"
        RUN_MODE="dev"
        ;;
esac

ENV_FILE="env.${ENV_MODE}.json"

# 从 JSON 配置生成 .env.local
if [ -f "$ENV_FILE" ]; then
    echo "Loading env from: $ENV_FILE"
    # 解析 JSON 并写入 .env.local
    > .env.local
    # 使用 node 解析 JSON（避免依赖 jq）
    node -e "
      const cfg = require('./${ENV_FILE}');
      for (const [k, v] of Object.entries(cfg)) {
        console.log(k + '=' + v);
      }
    " >> .env.local
else
    echo "⚠️  配置文件 $ENV_FILE 不存在，请创建后重试"
    echo "   示例: { \"NEXT_PUBLIC_API_URL\": \"http://localhost:9001\" }"
    exit 1
fi

# 读取生成的环境变量
set -a
source .env.local
set +a

PORT="${PORT:-3000}"

echo "======================================"
echo "  Juno Frontend [${ENV_MODE}]"
echo "======================================"
echo "Port: $PORT"
echo "API:  $NEXT_PUBLIC_API_URL"
echo "======================================"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

if [ "$RUN_MODE" = "prod" ]; then
    echo "Building for production..."
    npm run build
    echo "Starting production server..."
    npm start
else
    echo "Starting dev server..."
    npm run dev
fi
