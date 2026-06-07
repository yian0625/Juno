// Juno API 客户端
// 所有接口均为 POST，请求/响应均为 JSON
// 需登录接口在 Header 中携带：Authorization: Bearer <token>

import type {
  Assistant,
  McpServerConfig,
  UserRagSource,
  UserRagItem,
  RagSearchResult,
  SearchMessageItem,
  Topic,
  TopicMessage,
  Model,
  UserModel,
  AvailableModel,
  AssistantModelProfile,
  RagModelProfile,
  PipelineConfig,
  AssistantGroup,
  UserMemory,
  SearchProvider,
  JunoHubAPIKey,
  JunoHubAPIKeyCreateResp,
  JunoHubAPIKeyVerifyResp,
  JunoHubRequestLog,
  JunoHubDocs,
} from './types'

const API_BASE_URL = ''
// SSE 流式请求直连后端，绕过 Next.js rewrites 的响应缓冲
const SSE_BASE_URL = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : ''

// ========== Token / User 管理 ==========

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('auth_token', token)
}

export function removeToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
}

export function setUser(user: any) {
  if (typeof window === 'undefined') return
  localStorage.setItem('user_info', JSON.stringify(user))
}

export function getUser() {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user_info')
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    localStorage.removeItem('user_info')
    return null
  }
}

export function removeUser() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('user_info')
}

// ========== 通用请求 ==========

async function request<T = any>(
  path: string,
  body: any = {},
  options: { needAuth?: boolean } = {}
): Promise<T> {
  const { needAuth = true } = options
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (needAuth && token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const fullUrl = `${API_BASE_URL}${path}`

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      mode: 'cors',
      credentials: 'omit',
    })

    if (!response.ok) {
      if (response.status === 401) {
        removeToken()
        removeUser()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        throw new Error('未授权，请重新登录')
      }

      let errorMsg = `HTTP ${response.status}`
      try {
        const errData = await response.json()
        errorMsg = errData.msg || errData.message || errorMsg
      } catch {}
      throw new Error(errorMsg)
    }

    const data = await response.json()

    // 后端响应格式：{ code: 200, data: {...}, message: "" }
    // code=200 表示成功，其他表示失败
    if (data.code !== undefined && data.code !== 200 && data.code !== 0) {
      throw new Error(data.message || data.msg || '请求失败')
    }

    return data.data != null ? data.data : data
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error(`无法连接到服务器 ${API_BASE_URL}`)
    }
    throw error
  }
}

// ========== 1. 登录模块 /login_api ==========

export const authAPI = {
  register: async (data: { account: string; password: string; nickname?: string }) => {
    return request<{ uid: number; token: string; nickname: string }>(
      '/login_api/register',
      data,
      { needAuth: false }
    )
  },

  login: async (data: { account: string; password: string }) => {
    return request<{ uid: number; token: string; nickname: string }>(
      '/login_api/login',
      data,
      { needAuth: false }
    )
  },

  visitorLogin: async (deviceId: string) => {
    return request<{ uid: number; token: string; nickname: string }>(
      '/login_api/visitor_login',
      { device_id: deviceId },
      { needAuth: false }
    )
  },
}

// ========== 2. 配置模块 /config_api ==========

export const configAPI = {
  getConfig: async () => {
    return request<{ configs: Record<string, string> }>(
      '/config_api/get_config',
      {},
      { needAuth: false }
    )
  },

  getAppList: async () => {
    return request<{ list: Array<{ name: string; icon: string; href: string }> }>(
      '/config_api/app_list'
    )
  },
}

// ========== 3. 助手模块 /assistant_api ==========

export const assistantAPI = {
  create: async (data: {
    name: string
    avatar_url?: string
    description?: string
    system_prompt?: string
    default_model_id?: number
    assistant_model_profile_id?: number
    mcp_servers?: { id: number }[]
    knowledge_sources?: { id: number }[]
    sample_questions?: string[]
    history_rounds?: number
    group_id?: number
    image_generation_enabled?: number
    web_search_engine?: string
  }) => {
    return request<Assistant>('/assistant_api/create', data)
  },

  update: async (data: { id: number } & Partial<{
    name: string
    avatar_url: string
    description: string
    system_prompt: string
    default_model_id: number
    assistant_model_profile_id: number
    mcp_servers: { id: number }[]
    knowledge_sources: { id: number }[]
    sample_questions: string[]
    history_rounds: number
    group_id: number
    image_generation_enabled: number
    web_search_engine: string
  }>) => {
    return request<Assistant>('/assistant_api/update', data)
  },

  delete: async (id: number) => {
    return request('/assistant_api/delete', { id })
  },

  get: async (id: number) => {
    return request<Assistant>('/assistant_api/get', { id })
  },

  list: async () => {
    return request<{ list: Assistant[] }>('/assistant_api/list')
  },

  saveToLibrary: async (id: number) => {
    return request<Assistant>('/assistant_api/save_to_library', { id })
  },

  submitReview: async (id: number) => {
    return request<Assistant>('/assistant_api/submit_review', { id })
  },

  reviewList: async (page = 1, pageSize = 20, status = -1) => {
    return request<{ list: any[]; total: number; page: number; page_size: number }>(
      '/assistant_api/review_list',
      { page, page_size: pageSize, status }
    )
  },

  myLibrary: async () => {
    return request<{ list: Assistant[] }>('/assistant_api/my_library')
  },

  marketplaceList: async (offset = 0, limit = 20) => {
    return request<{ list: Assistant[]; total: number }>(
      '/assistant_api/marketplace/list',
      { offset, limit }
    )
  },

  clone: async (assistantId: number) => {
    return request<Assistant>('/assistant_api/clone', { assistant_id: assistantId })
  },
}

// ========== 4. MCP Server 模块 /mcp_api ==========

export const mcpAPI = {
  create: async (data: {
    name: string
    url: string
    transport_type?: string
    headers?: Record<string, string>
  }) => {
    return request<McpServerConfig>('/mcp_api/create', data)
  },

  update: async (data: { id: number } & Partial<{
    name: string
    url: string
    transport_type: string
    headers: Record<string, string>
  }>) => {
    return request<McpServerConfig>('/mcp_api/update', data)
  },

  delete: async (id: number) => {
    return request('/mcp_api/delete', { id })
  },

  list: async () => {
    return request<{ list: McpServerConfig[] }>('/mcp_api/list')
  },

  refresh: async (id: number) => {
    return request<McpServerConfig>('/mcp_api/refresh', { id })
  },
}

// ========== 5. RAG 知识库模块 /rag_api ==========

export const ragAPI = {
  createSource: async (name: string, embeddingModelId?: number, ragModelProfileId?: number) => {
    return request<UserRagSource>('/rag_api/source/create', { name, embedding_model_id: embeddingModelId, rag_model_profile_id: ragModelProfileId })
  },

  updateSource: async (id: number, data: { name?: string; embedding_model_id?: number; embedding_model?: string; rag_model_profile_id?: number; pipeline_config?: Partial<PipelineConfig> }) => {
    return request<UserRagSource>('/rag_api/source/update', { id, ...data })
  },

  deleteSource: async (id: number) => {
    return request('/rag_api/source/delete', { id })
  },

  listSources: async () => {
    return request<{ list: UserRagSource[] }>('/rag_api/source/list')
  },

  getSourceInfo: async () => {
    return request<{ embedding_model: string; embedding_model_id: number; embedding_model_alias: string }>('/rag_api/source/info')
  },
  ingestFile: async (sourceId: number, file: File) => {
    const formData = new FormData()
    formData.append('source_id', String(sourceId))
    formData.append('file', file)
    const token = getToken()
    const res = await fetch('/rag_api/ingest_file', {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    })
    if (!res.ok) throw new Error(`Upload failed (${res.status})`)
    const json = await res.json()
    if (json.code !== 200 && json.code !== 0) throw new Error(json.message || json.msg || 'Upload failed')
    return json.data as { chunk_count: number; item_id: number }
  },

  ingestURL: async (sourceId: number, url: string, name?: string) => {
    return request('/rag_api/ingest_url', { source_id: sourceId, url, name })
  },

  ingestSitemap: async (sourceId: number, sitemapURL: string) => {
    return request<{ url_count: number }>('/rag_api/ingest_sitemap', { source_id: sourceId, sitemap_url: sitemapURL })
  },

  listItems: async (sourceId: number, itemType = 0) => {
    return request<{ list: UserRagItem[] }>('/rag_api/item/list', { source_id: sourceId, item_type: itemType })
  },

  deleteItem: async (id: number) => {
    return request('/rag_api/item/delete', { id })
  },

  retryItem: async (id: number) => {
    return request('/rag_api/item/retry', { id })
  },

  search: async (sourceIds: number[], query: string, topK = 5) => {
    return request<{ results: RagSearchResult[] }>(
      '/rag_api/search',
      { source_ids: sourceIds, query, top_k: topK }
    )
  },
}

// ========== 6. 话题模块 /topic_api ==========

export const topicAPI = {
  create: async (assistantId: number, title?: string, selectedModelAlias?: string) => {
    const body: any = { assistant_id: assistantId }
    if (title) body.title = title
    if (selectedModelAlias) body.selected_model_alias = selectedModelAlias
    return request<Topic>('/topic_api/create', body)
  },

  delete: async (id: number) => {
    return request('/topic_api/delete', { id })
  },

  update: async (id: number, data: { title?: string; selected_model_alias?: string } | string) => {
    if (typeof data === 'string') {
      return request('/topic_api/update', { id, title: data })
    }
    return request('/topic_api/update', { id, ...data })
  },

  list: async (params?: { assistant_id?: number; offset?: number; limit?: number }) => {
    return request<{ list: Topic[]; total: number }>('/topic_api/list', params || {})
  },

  messages: async (topicId: number, limit?: number) => {
    const body: any = { topic_id: topicId }
    if (limit) body.limit = limit
    return request<{ list: TopicMessage[] }>('/topic_api/messages', body)
  },

  export: async (topicId: number, format: 'json' | 'markdown') => {
    return request<{ content: string; filename: string }>('/topic_api/export', { topic_id: topicId, format })
  },

  exportAll: async (format: 'json' | 'markdown') => {
    return request<{ content: string; filename: string }>('/topic_api/export_all', { format })
  },
}

// ========== 7. 聊天模块 /chat_api ==========

export const chatAPI = {
  /**
   * SSE 流式对话
   * 返回 AbortController 以便外部取消
   */
  completions: async (
    params: {
      messages: Array<{ role: string; content: string }>
      topic_id?: number
      assistant_id?: number
      model?: string
    },
    callbacks: {
      onDelta?: (content: string) => void
      onError?: (error: { code: number; message: string }) => void
      onDone?: () => void
    }
  ): Promise<AbortController> => {
    const token = getToken()
    if (!token) throw new Error('未登录')

    const controller = new AbortController()
    const url = `${SSE_BASE_URL}/chat_api/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is null')

    const decoder = new TextDecoder()
    let buffer = ''

    ;(async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            callbacks.onDone?.()
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data:')) continue

            const dataStr = trimmed.slice(5).trim()

            // 流结束标志
            if (dataStr === '[DONE]') {
              callbacks.onDone?.()
              return
            }

            try {
              const parsed = JSON.parse(dataStr)

              // 错误事件
              if (parsed.error) {
                callbacks.onError?.(parsed.error)
                return
              }

              // 正常内容
              if (parsed.content) {
                callbacks.onDelta?.(parsed.content)
              }
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          callbacks.onError?.({ code: 0, message: err.message })
        }
      }
    })()

    return controller
  },

  getModels: async () => {
    return request<{ models: Model[] }>('/chat_api/models', {})
  },
}

// ========== 8. 提供商模块 /provider_api ==========

export const providerAPI = {
  fetchSystemModels: async () => {
    return request<{ models: { id: number; model_id: string; display_name: string; group: string; icon_url: string; model_type: string; model_capabilities?: string[] }[] }>('/provider_api/system_models')
  },

  fetchSystemModelsByType: async (modelType: string) => {
    return request<{ models: { id: number; model_id: string; display_name: string; group: string; provider_service?: string; icon_url: string; model_type: string; model_capabilities?: string[] }[] }>('/provider_api/system_models_by_type', { model_type: modelType })
  },

  createModel: async (data: { model_id: string; display_name?: string }) => {
    return request<UserModel>('/provider_api/model/create', data)
  },

  updateModel: async (data: { id: number; display_name?: string; is_enabled?: number; sort_order?: number }) => {
    return request<UserModel>('/provider_api/model/update', data)
  },

  deleteModel: async (id: number) => {
    return request('/provider_api/model/delete', { id })
  },

  listModels: async () => {
    return request<{ list: UserModel[] }>('/provider_api/model/list', {})
  },

  batchAddModels: async (models: { model_id: string; display_name: string }[]) => {
    return request<{ list: UserModel[] }>('/provider_api/model/batch_add', { models })
  },

  listAllModels: async () => {
    return request<{ models: AvailableModel[] }>('/provider_api/models_all')
  },

  listAssistantModelProfiles: async () => {
    return request<{ list: AssistantModelProfile[] }>('/provider_api/assistant_model_profiles')
  },

  listRagModelProfiles: async () => {
    return request<{ list: RagModelProfile[] }>('/provider_api/rag_model_profiles')
  },
}

// ========== 8.5 记忆模块 /memory_api ==========

export const memoryAPI = {
  list: async () => {
    return request<{ list: UserMemory[] }>('/memory_api/list')
  },
  create: async (content: string, category?: string) => {
    return request<{ memory: UserMemory }>('/memory_api/create', { content, category: category || 'other' })
  },
  update: async (id: number, content: string, category?: string) => {
    return request('/memory_api/update', { id, content, category: category || 'other' })
  },
  delete: async (id: number) => {
    return request('/memory_api/delete', { id })
  },
  search: async (query: string, topK?: number) => {
    return request<{ list: UserMemory[] }>('/memory_api/search', { query, top_k: topK || 10 })
  },
}

// ========== 9. 设置模块 /settings_api ==========

export const settingsAPI = {
  get: async () => {
    return request<{ openai_api_key: string; openai_base_url: string; anthropic_api_key: string; google_api_key: string; preferences: string }>('/settings_api/get')
  },
  save: async (data: { openai_api_key?: string; openai_base_url?: string; anthropic_api_key?: string; google_api_key?: string; preferences?: string }) => {
    return request('/settings_api/save', data)
  },
  // 便捷方法：读写 preferences JSON
  getPreferences: async (): Promise<Record<string, any>> => {
    const result = await request<{ preferences: string }>('/settings_api/get')
    try { return JSON.parse(result.preferences || '{}') } catch { return {} }
  },
  savePreferences: async (prefs: Record<string, any>) => {
    return request('/settings_api/save', { preferences: JSON.stringify(prefs) })
  },
}

// ========== 9. 搜索 + 消息操作 /topic_api ==========

export const messageAPI = {
  search: async (keyword: string, offset = 0, limit = 20) => {
    return request<{ list: SearchMessageItem[]; total: number }>(
      '/topic_api/search_messages',
      { keyword, offset, limit }
    )
  },

  delete: async (id: number) => {
    return request('/topic_api/delete_message', { id })
  },

  update: async (id: number, content: string) => {
    return request('/topic_api/update_message', { id, content })
  },
}

// ========== 10. 用户资料 /login_api ==========

export const userAPI = {
  updateProfile: async (data: { nickname?: string }) => {
    return request('/login_api/update_profile', data)
  },
}

// ========== 11. 文件上传 /topic_api ==========

// ========== MiniApp API ==========

export const miniappAPI = {
  create: (data: { name: string; url: string; icon?: string; description?: string }) =>
    request('/miniapp_api/create', data),
  update: (data: { id: number; name: string; url: string; icon?: string; description?: string }) =>
    request('/miniapp_api/update', data),
  delete: (id: number) => request('/miniapp_api/delete', { id }),
  list: () => request('/miniapp_api/list', {}),
}

// ========== Upload ==========

export const uploadAPI = {
  uploadFile: async (file: File) => {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/topic_api/upload_file', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`Upload failed: HTTP ${response.status}`)
    }
    
    const data = await response.json()
    if (data.code !== undefined && data.code !== 200 && data.code !== 0) {
      throw new Error(data.message || 'Upload failed')
    }
    return data.data as { url: string; filename: string; file_type: string; size: number }
  },
}

export const assistantGroupAPI = {
  create: async (name: string) => {
    return request<AssistantGroup>('/assistant_group_api/create', { name })
  },
  update: async (id: number, data: { name?: string; sort_order?: number }) => {
    return request<AssistantGroup>('/assistant_group_api/update', { id, ...data })
  },
  delete: async (id: number) => {
    return request('/assistant_group_api/delete', { id })
  },
list: async () => {
return request<{ list: AssistantGroup[] }>('/assistant_group_api/list')
},
}

// ========== Admin API ==========

export const adminAPI = {
  reviewList: async (page = 1, pageSize = 20, status = -1) => {
    return request<{ list: any[]; total: number; page: number; page_size: number }>(
      '/admin/assistant/review_list', { page, page_size: pageSize, status }
    )
  },
  approveReview: async (reviewId: number) => {
    return request('/admin/assistant/approve', { review_id: reviewId })
  },
  rejectReview: async (reviewId: number, rejectReason: string) => {
    return request('/admin/assistant/reject', { review_id: reviewId, reject_reason: rejectReason })
  },
}

// ========== 搜索引擎 /search_provider_api ==========

export const searchProviderAPI = {
  list: async () => {
    return request<{ list: SearchProvider[] }>('/search_provider_api/list')
  },
}

// ========== Juno Hub API Key /juno_hub_api_key ==========

export const junoHubAPIKeyAPI = {
  list: async (page = 1, pageSize = 50, keyword = '') => {
    return request<{ list: JunoHubAPIKey[]; total: number; page: number; page_size: number }>(
      '/juno_hub_api_key/list',
      { page, page_size: pageSize, keyword }
    )
  },

  create: async (data: { name?: string; description?: string; allowed_models?: string[]; expires_at?: number }) => {
    return request<JunoHubAPIKeyCreateResp>('/juno_hub_api_key/create', data)
  },

  update: async (data: { id: number; name?: string; description?: string; status?: number }) => {
    return request<JunoHubAPIKey>('/juno_hub_api_key/update', data)
  },

  delete: async (id: number) => {
    return request('/juno_hub_api_key/delete', { id })
  },

  docs: async () => {
    return request<JunoHubDocs>('/juno_hub_api_key/docs', {})
  },

  verify: async (data: { id?: number; key?: string }) => {
    return request<JunoHubAPIKeyVerifyResp>('/juno_hub_api_key/verify', data)
  },

  logs: async (page = 1, pageSize = 20, apiKeyId = 0) => {
    return request<{ list: JunoHubRequestLog[]; total: number; page: number; page_size: number }>(
      '/juno_hub_api_key/logs',
      { page, page_size: pageSize, api_key_id: apiKeyId }
    )
  },
}

// ========== Codex-style Task API /task_api ==========

export interface AgentTask {
  id: number
  uid: number
  title: string
  repo_url: string
  branch: string
  prompt: string
  model_profile_id: number
  status: 0 | 1 | 2 | 3 | 4  // pending | running | done | failed | canceled
  result_diff: string
  result_summary: string
  error_msg: string
  workspace_path: string
  create_time: number
  update_time: number
}

export interface ProjectInfo {
  name: string
  path: string
  is_git: boolean
  files: number
}

export const taskAPI = {
  listProjects: async () =>
    request<{ list: ProjectInfo[] }>('/task_api/projects', {}),

  createProject: async (name: string) =>
    request<ProjectInfo>('/task_api/projects/create', { name }),

  create: async (data: {
    workspace_name: string
    prompt: string
    model_profile_id: number
  }) => request<AgentTask>('/task_api/create', data),

  list: async (page = 1, pageSize = 20) =>
    request<{ list: AgentTask[]; total: number; page: number; page_size: number }>(
      '/task_api/list', { page, page_size: pageSize }
    ),

  get: async (id: number) => request<AgentTask>('/task_api/get', { id }),

  cancel: async (id: number) => request('/task_api/cancel', { id }),

  createPR: async (data: {
    task_id: number
    repo_url: string       // GitHub URL needed for PR
    base_branch?: string
    github_token: string
    pr_title: string
    pr_body?: string
  }) => request<{ pr_url: string }>('/task_api/create_pr', data),
}

// ========== Agent /agent_api ==========

export type AgentEvent =
  | { type: 'session_start'; session_id: string }
  | { type: 'session_title'; title: string }
  | { type: 'text'; content: string }
  | { type: 'tool_start'; id: string; name: string; args: Record<string, any> }
  | { type: 'tool_output'; id: string; output: string }
  | { type: 'tool_end'; id: string; name: string; result: string; error: string }
  | { type: 'tool_approval'; session_id: string; id: string; name: string; args: Record<string, any> }
  | { type: 'workspace_files'; files: string[] }
  | { type: 'context_stats'; round: number; estimated_tokens: number }
  | { type: 'done' }
  | { type: 'error'; message: string }

export const agentAPI = {
  approve: async (sessionId: string, toolCallId: string, approved: boolean) => {
    return request(`/agent_api/session/${sessionId}/approve`, { tool_call_id: toolCallId, approved })
  },

  setupWorkspace: async (data: { git_url?: string; name?: string }) => {
    return request<{ path: string; name: string; project_type: string; files: string[]; is_git: boolean; git_branch: string }>(
      '/agent_api/workspace/setup', data
    )
  },

  listWorkspaces: async () => {
    return request<{ list: { path: string; name: string; project_type: string; files: string[]; is_git: boolean; git_branch: string }[] }>(
      '/agent_api/workspace/list', {}
    )
  },

  run: async (
    params: {
      model_profile_id?: number         // primary profile: all tool_calls & reasoning
      model_alias?: string              // fallback when no assistant model profile exists
      compact_profile_id?: number       // cheaper model for context compaction
      title_profile_id?: number         // cheapest model for auto title generation
      sub_agent_profile_id?: number     // model for spawned worker sub-agents
      assistant_id?: number
      topic_id?: number
      approval_mode?: 'ask' | 'auto' | 'full' | 'readonly'
      workspace_enabled?: boolean
      workspace_name?: string
      workspace_path?: string
      messages: { role: string; content: string }[]
    },
    callbacks: { onEvent?: (e: AgentEvent) => void; onDone?: () => void; onError?: (msg: string) => void }
  ): Promise<AbortController> => {
    const token = getToken()
    if (!token) throw new Error('未登录')

    const controller = new AbortController()
    const url = `${SSE_BASE_URL}/agent_api/run`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    ;(async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { callbacks.onDone?.(); break }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const dataStr = trimmed.slice(5).trim()
            if (!dataStr) continue
            try {
              const event = JSON.parse(dataStr) as AgentEvent
              callbacks.onEvent?.(event)
              if (event.type === 'done') { callbacks.onDone?.(); return }
              if (event.type === 'error') { callbacks.onError?.(event.message); return }
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          callbacks.onDone?.()
        } else {
          callbacks.onError?.(err.message)
        }
      }
    })()

    return controller
  },
}

// ========== 生图 /image_api ==========

export const imageAPI = {
  listPlans: async () => {
    return request<{ list: { id: number; name: string }[] }>('/image_api/plans')
  },
  generate: async (data: { plan_id: number; prompt: string; size?: string; n?: number }) => {
    return request<{ images: string[] }>('/image_api/generate', data)
  },
}
