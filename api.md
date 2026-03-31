# Juno API 接口文档

所有接口均为 **POST**，请求/响应均为 JSON。


需登录接口在 Header 中携带：`Authorization: Bearer <token>`

通用响应格式：

```json
{
  "code": 0,
  "msg": "ok",
  "data": { ... }
}
```

---

## 1. 登录模块 `/login_api`

> 无需登录

### POST `/login_api/register`

账号注册，注册成功直接返回登录态。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| account | string | Y | 账号 |
| password | string | Y | 密码 |
| nickname | string | N | 昵称，不传则默认"用户{account}" |

**Response**

```json
{
  "uid": 47454782620696577,
  "token": "eyJhbGciOi...",
  "nickname": "用户test01"
}
```

---

### POST `/login_api/login`

账号密码登录。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| account | string | Y | 账号 |
| password | string | Y | 密码 |

**Response** — 同 register

---

### POST `/login_api/visitor_login`

游客登录，首次自动注册。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| device_id | string | Y | 设备唯一标识 |

**Response** — 同 register

---

### POST `/login_api/email_login`

邮箱登录（暂未实现）。

---

## 2. 配置模块 `/config_api`

> 无需登录

### POST `/config_api/get_config`

获取应用公开配置。

**Request**

```json
{}
```

**Response**

```json
{
  "configs": {
    "key1": "value1",
    "key2": "value2"
  }
}
```

---

## 3. 助手模块 `/assistant_api`

> 需登录

### POST `/assistant_api/create`

创建助手。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | Y | 助手名称 |
| avatar_url | string | N | 头像 URL |
| description | string | N | 助手描述 |
| system_prompt | string | N | 系统提示词 |
| default_model_id | int64 | N | 默认模型 ID |
| mcp_servers | array | N | 绑定的 MCP Server，格式 `[{"id": 1}]` |
| knowledge_sources | array | N | 绑定的知识库，格式 `[{"id": 1}]` |
| sample_questions | string[] | N | 示例问题列表 |
| history_rounds | int | N | 历史对话轮数，默认 10 |

**Response** — Assistant 对象

```json
{
  "id": 1,
  "uid": 47454782620696577,
  "name": "我的助手",
  "avatar_url": "",
  "description": "一个智能助手",
  "system_prompt": "你是一个有帮助的助手",
  "default_model_id": 1,
  "mcp_servers": [{"id": 1}],
  "knowledge_sources": [{"id": 1}],
  "sample_questions": ["你好", "帮我写代码"],
  "assistant_type": 0,
  "history_rounds": 10,
  "status": 1,
  "create_time": 1711872000,
  "update_time": 1711872000
}
```

---

### POST `/assistant_api/update`

更新助手。

**Request** — 同 create，额外必传 `id`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int64 | Y | 助手 ID |
| ... | | | 其余字段同 create |

**Response** — 更新后的 Assistant 对象

---

### POST `/assistant_api/delete`

删除助手（软删除）。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int64 | Y | 助手 ID |

**Response**

```json
{}
```

---

### POST `/assistant_api/get`

获取助手详情。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int64 | Y | 助手 ID |

**Response** — Assistant 对象

---

### POST `/assistant_api/list`

获取当前用户的助手列表。

**Request**

```json
{}
```

**Response**

```json
{
  "list": [Assistant, ...]
}
```

---

### POST `/assistant_api/publish`

发布助手到市场。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int64 | Y | 助手 ID |

**Response**

```json
{}
```

---

### POST `/assistant_api/unpublish`

从市场下架助手。

**Request / Response** — 同 publish

---

### POST `/assistant_api/marketplace/list`

浏览助手市场。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| offset | int | N | 偏移量，默认 0 |
| limit | int | N | 每页数量，默认 20，最大 50 |

**Response**

```json
{
  "list": [Assistant, ...],
  "total": 100
}
```

---

### POST `/assistant_api/clone`

从市场克隆助手到自己账号下。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| assistant_id | int64 | Y | 市场助手 ID |

**Response** — 克隆后的 Assistant 对象

---

## 4. MCP Server 模块 `/mcp_api`

> 需登录

### POST `/mcp_api/create`

创建 MCP Server 配置。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | Y | 名称 |
| url | string | Y | MCP Server URL |
| transport_type | string | N | 传输协议，默认 `sse` |
| headers | object | N | 自定义请求头 `{"key": "value"}` |

**Response** — McpServerConfig 对象

```json
{
  "id": 1,
  "uid": 47454782620696577,
  "name": "天气查询",
  "url": "https://mcp.example.com/weather",
  "transport_type": "sse",
  "headers": {},
  "tools": [],
  "status": 1,
  "create_time": 1711872000,
  "update_time": 1711872000
}
```

---

### POST `/mcp_api/update`

更新 MCP Server 配置。

**Request** — 同 create，额外必传 `id`

**Response** — 更新后的 McpServerConfig 对象

---

### POST `/mcp_api/delete`

删除 MCP Server（软删除）。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int64 | Y | MCP Server ID |

**Response**

```json
{}
```

---

### POST `/mcp_api/list`

获取当前用户的 MCP Server 列表。

**Request**

```json
{}
```

**Response**

```json
{
  "list": [McpServerConfig, ...]
}
```

---

### POST `/mcp_api/refresh`

连接 MCP Server 并刷新可用工具列表。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int64 | Y | MCP Server ID |

**Response** — 刷新 tools 后的 McpServerConfig 对象

---

## 5. RAG 知识库模块 `/rag_api`

> 需登录

### POST `/rag_api/source/create`

创建知识源。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | Y | 知识源名称 |

**Response** — UserRagSource 对象

```json
{
  "id": 1,
  "uid": 47454782620696577,
  "name": "产品文档",
  "status": 1,
  "create_time": 1711872000,
  "update_time": 1711872000
}
```

---

### POST `/rag_api/source/delete`

删除知识源及其所有数据。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int64 | Y | 知识源 ID |

**Response**

```json
{}
```

---

### POST `/rag_api/source/list`

获取当前用户的知识源列表。

**Request**

```json
{}
```

**Response**

```json
{
  "list": [UserRagSource, ...]
}
```

---

### POST `/rag_api/ingest`

向知识源导入文本。文本会自动分块并生成向量。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source_id | int64 | Y | 知识源 ID |
| text | string | Y | 待导入的文本内容 |

**Response**

```json
{}
```

---

### POST `/rag_api/search`

在知识库中搜索相关内容。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source_ids | int64[] | Y | 要搜索的知识源 ID 列表 |
| query | string | Y | 搜索内容 |
| top_k | int | N | 返回条数，默认 5 |

**Response**

```json
{
  "results": [
    {
      "id": 1,
      "chunk_text": "相关文本片段...",
      "score": 0.92
    }
  ]
}
```

---

## 6. 话题模块 `/topic_api`

> 需登录

### POST `/topic_api/create`

创建话题。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| assistant_id | int64 | Y | 绑定的助手 ID |
| title | string | N | 标题，可不传，首轮对话后服务端自动生成 |

**Response** — Topic 对象

```json
{
  "id": 1,
  "uid": 47454782620696577,
  "assistant_id": 123,
  "title": "",
  "status": 1,
  "create_time": 1711872000,
  "update_time": 1711872000
}
```

---

### POST `/topic_api/delete`

删除话题及其所有消息（软删除）。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int64 | Y | 话题 ID |

**Response**

```json
{}
```

---

### POST `/topic_api/update`

更新话题标题。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int64 | Y | 话题 ID |
| title | string | Y | 新标题 |

**Response**

```json
{}
```

---

### POST `/topic_api/list`

获取话题列表（分页）。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| assistant_id | int64 | N | 按助手筛选，不传则返回用户所有话题 |
| offset | int | N | 偏移量，默认 0 |
| limit | int | N | 每页数量，默认 50，最大 200 |

**Response**

```json
{
  "list": [
    {
      "id": 1,
      "assistant_id": 123,
      "title": "关于 Go 语言的讨论",
      "create_time": 1711872000,
      "update_time": 1711872000
    }
  ],
  "total": 25
}
```

---

### POST `/topic_api/messages`

获取话题的历史消息。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| topic_id | int64 | Y | 话题 ID |
| limit | int | N | 返回条数 |

**Response**

```json
{
  "list": [
    {
      "id": 1,
      "topic_id": 1,
      "role": "user",
      "content": "你好",
      "model_alias": "",
      "create_time": 1711872000
    },
    {
      "id": 2,
      "topic_id": 1,
      "role": "assistant",
      "content": "你好！有什么可以帮助你的？",
      "model_alias": "gpt-4o",
      "create_time": 1711872001
    }
  ]
}
```

---

## 7. 聊天模块 `/chat_api`

> 需登录

### POST `/chat_api/completions`

流式对话（SSE）。

**Request**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | N | 模型别名（如 `gpt-4o`），不传使用助手默认模型 |
| assistant_id | int64 | N | 助手 ID，topic 存在时可不传（自动 fallback） |
| topic_id | int64 | N | 话题 ID，传了则自动加载历史、保存消息、生成标题 |
| messages | array | Y | 当前轮消息 `[{"role":"user","content":"你好"}]` |

**行为说明**

| 场景 | topic_id | 行为 |
|------|----------|------|
| 无状态对话 | 0 或不传 | 不保存消息，不加载历史 |
| 话题对话 | > 0 | 自动加载历史消息，对话结束后保存 user + assistant 消息 |
| 首轮对话 | > 0 且话题无标题 | 服务端异步调用 LLM 生成标题 |

**Response** — SSE 事件流

```
data: {"role":"assistant","content":"你"}

data: {"role":"assistant","content":"好"}

data: {"role":"assistant","content":"！"}

data: [DONE]
```

错误事件：

```
data: {"error":{"code":500,"message":"error message"}}
```

---

### POST `/chat_api/models`

获取可用模型列表。

**Request**

```json
{}
```

**Response**

```json
{
  "models": [
    {
      "id": 1,
      "name": "GPT-4o",
      "alias": "gpt-4o",
      "provider": "openai"
    }
  ]
}
```

---

## 客户端功能清单

### 页面结构

| 页面 | 说明 |
|------|------|
| 登录/注册页 | 支持账号密码登录、游客登录 |
| 助手列表页 | 展示「我的助手」+ 「助手市场」两个 Tab |
| 助手编辑页 | 创建/编辑助手：名称、头像、描述、System Prompt、默认模型、MCP Server、知识库、示例问题、历史轮数 |
| 话题列表页 | 进入助手后展示该助手的话题列表，支持分页加载，可新建/删除/重命名话题 |
| 聊天页 | SSE 流式对话，展示历史消息，支持切换模型 |
| MCP Server 管理页 | 增删改查 MCP Server，支持刷新工具列表 |
| 知识库管理页 | 创建知识源、导入文本、搜索测试 |

### 核心交互流程

**新建对话**

```
1. 用户进入助手 → 点击「新对话」
2. 调用 POST /topic_api/create { assistant_id }
3. 拿到 topic 对象，进入聊天页
```

**发送消息**

```
1. 用户输入消息
2. 调用 POST /chat_api/completions {
     topic_id, messages: [{ role: "user", content: "..." }]
   }
3. SSE 流式接收 assistant 回复，逐字渲染
4. 收到 [DONE] 后结束
5. 消息已由服务端自动保存，无需客户端额外操作
```

**进入已有话题**

```
1. 调用 POST /topic_api/messages { topic_id }
2. 渲染历史消息列表
3. 用户可继续发消息（流程同上）
```

**话题标题**

```
- 首轮对话后服务端自动生成标题
- 客户端刷新话题列表即可看到更新后的标题
- 用户也可手动调用 /topic_api/update 修改标题
```

**无话题模式（快速对话）**

```
- topic_id 不传或传 0
- 不保存历史，适用于一次性提问
```

### SSE 解析要点

1. 响应 Content-Type 为 `text/event-stream`
2. 每条数据格式：`data: {"role":"assistant","content":"..."}\n\n`
3. 流结束标志：`data: [DONE]\n\n`
4. 错误格式：`data: {"error":{"code":500,"message":"..."}}\n\n`
5. 客户端逐条读取 `data:` 行，拼接 `content` 字段渲染
