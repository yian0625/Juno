# Juno

AI 助手平台前端

## 技术栈

- Next.js 15 (App Router) + React 19
- Tailwind CSS + shadcn/ui
- TypeScript

## 启动

```bash
# 开发环境
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev

# 或使用 start.sh
./start.sh

# 生产环境
./start.sh -prod
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| NEXT_PUBLIC_API_URL | 后端 API 地址 | http://localhost:8080 |
| PORT | 前端端口 | 3000 |
