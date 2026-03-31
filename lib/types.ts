// ========== 通用 ==========

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

// ========== 登录模块 ==========

export interface LoginResponse {
  uid: number
  token: string
  nickname: string
}

// ========== 助手模块 ==========

export interface McpServerRef {
  id: number
}

export interface KnowledgeSourceRef {
  id: number
}

export interface Assistant {
  id: number
  uid: number
  name: string
  avatar_url: string
  description: string
  system_prompt: string
  default_model_id: number
  mcp_servers: McpServerRef[]
  knowledge_sources: KnowledgeSourceRef[]
  sample_questions: string[]
  assistant_type: number
  history_rounds: number
  status: number
  create_time: number
  update_time: number
}

// ========== MCP Server 模块 ==========

export interface McpTool {
  name: string
  description: string
  input_schema?: any
}

export interface McpServerConfig {
  id: number
  uid: number
  name: string
  url: string
  transport_type: string
  headers: Record<string, string>
  tools: McpTool[]
  status: number
  create_time: number
  update_time: number
}

// ========== RAG 知识库模块 ==========

export interface UserRagSource {
  id: number
  uid: number
  name: string
  status: number
  create_time: number
  update_time: number
}

export interface RagSearchResult {
  id: number
  chunk_text: string
  score: number
}

// ========== 话题模块 ==========

export interface Topic {
  id: number
  uid?: number
  assistant_id: number
  title: string
  status?: number
  create_time: number
  update_time: number
}

export interface TopicMessage {
  id: number
  topic_id: number
  role: 'user' | 'assistant'
  content: string
  model_alias: string
  create_time: number
}

// ========== 聊天模块 ==========

export interface Model {
  id: number
  name: string
  alias: string
  provider: string
}

