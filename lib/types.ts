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
  default_model_alias?: string
  assistant_model_profile_id: number
  mcp_servers: McpServerRef[]
  knowledge_sources: KnowledgeSourceRef[]
  sample_questions: string[]
  assistant_type: number
  review_status: number
  history_rounds: number
  group_id: number
  status: number
  create_time: number
  update_time: number
  is_default: number
  image_generation_enabled: number
  web_search_engine: string
}

export interface SearchProvider {
  id: number
  name: string
  provider_type: string
  icon_url: string
}

export interface AssistantGroup {
  id: number
  uid: number
  name: string
  sort_order: number
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

export interface PipelineConfig {
  hybrid_search: boolean
  rerank: boolean
  rerank_top_n: number
  rerank_threshold: number
  fallback_threshold: number
  min_context_items: number
  vector_threshold: number
  query_rewrite: boolean
  chunk_size: number
  chunk_overlap: number
}

export interface UserRagSource {
  id: number
  uid: number
  name: string
  embedding_model_id: number
  embedding_model: string
  rag_model_profile_id: number
  pipeline_config: PipelineConfig
  status: number
  create_time: number
  update_time: number
  chunk_count: number
  item_count: number
}

export interface UserRagItem {
  id: number
  uid: number
  source_id: number
  item_type: number // 1=file, 3=url
  name: string
  file_size: number
  status: number // 0=pending, 1=processing, 2=completed, 3=failed
  chunk_count: number
  error_msg: string
  create_time: number
  update_time: number
}
export interface RagSearchResult {
  chunk_text: string
  score: number
}

// ========== 话题模块 ==========

export interface Topic {
  id: number
  uid?: number
  assistant_id: number
  selected_model_alias?: string
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
  name?: string
  alias: string
  provider: string
  model_name?: string
  api_format?: string
  model_type?: string
  model_capabilities?: string[]
}

// ========== 搜索模块 ==========

export interface SearchMessageItem extends TopicMessage {
  topic_title: string
  assistant_id: number
  assistant_name: string
}

// ========== 设置模块 ==========

export interface UserSettings {
  openai_api_key: string
  openai_base_url: string
  anthropic_api_key: string
  google_api_key: string
}

// ========== 提供商模块 ==========

export interface UserModel {
  id: number
  provider_id: number
  model_id: string
  display_name: string
  group: string
  icon_url: string
  is_enabled: number
  sort_order: number
  create_time: number
}

export interface AvailableModel {
  id: number
  model_id: string
  display_name: string
  provider: string
  provider_name: string
  group: string
  source: 'system' | 'user'
  icon_url: string
  model_type: string
  model_capabilities?: string[]
}

export interface AssistantModelProfile {
  id: number
  name: string
  chat_model_id: number
  chat_model_alias: string
  chat_model_icon_url: string
  provider_type: string
  image_generation_enabled: number
  image_model_alias: string
}

export interface RagModelProfile {
  id: number
  name: string
  embedding_model_id: number
  embedding_model_alias: string
}

export interface JunoHubAPIKey {
  id: number
  uid: number
  name: string
  description: string
  protected?: boolean
  key_prefix: string
  key_masked: string
  key?: string
  allowed_models: string[]
  status: number
  expires_at: number
  budget_used: number
  metadata: Record<string, string>
  total_requests: number
  last_used_time: number
  create_time: number
  update_time: number
}

export interface JunoHubAPIKeyCreateResp extends JunoHubAPIKey {
  key: string
}

export interface JunoHubAPIKeyVerifyResp {
  ok: boolean
  base_url: string
  status_code: number
  message: string
  key_masked: string
  models: string[]
  model_count: number
}

export interface JunoHubRequestLog {
  id: number
  api_key_id: number
  key_prefix: string
  model_alias: string
  upstream_model: string
  provider_type: string
  request_id: string
  is_stream: number
  status_code: number
  error_message: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  credits_consumed: number
  duration_ms: number
  create_time: number
  metadata: Record<string, any>
  route_trace: Array<{
    deployment_id: number
    provider_type: string
    upstream_model: string
    attempt: number
    status_code: number
    error?: string
  }>
  tags: string[]
}

export interface JunoHubDocsAbility {
  deployment_id: number
  ability_name: string
  description: string
  path: string
  method: string
  model: string
  model_alias: string
  provider_type: string
  upstream_model: string
  api_format: string
  health_status: string
  last_checked_at: number
  related_paths: string[]
}

export interface JunoHubDocsCategory {
  ability_group: string
  list: JunoHubDocsAbility[]
}

export interface JunoHubDocs {
  base_url: string
  models: string[]
  categories: JunoHubDocsCategory[]
}

export interface UserMemory {
  id: number
  uid: number
  content: string
  category: string
  source_id: number
  item_id: number
  status: number
  create_time: number
  update_time: number
}
