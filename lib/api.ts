// Juno API 客户端
// 所有接口均为 POST，请求/响应均为 JSON
// 需登录接口在 Header 中携带：Authorization: Bearer <token>

import type {
  Assistant,
  McpServerConfig,
  UserRagSource,
  RagSearchResult,
  Topic,
  TopicMessage,
  Model,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_BASE_URL) {
  console.warn('NEXT_PUBLIC_API_URL 环境变量未设置，请通过 ./start.sh 启动服务')
}

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
  return userStr ? JSON.parse(userStr) : null
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
}

// ========== 3. 助手模块 /assistant_api ==========

export const assistantAPI = {
  create: async (data: {
    name: string
    avatar_url?: string
    description?: string
    system_prompt?: string
    default_model_id?: number
    mcp_servers?: { id: number }[]
    knowledge_sources?: { id: number }[]
    sample_questions?: string[]
    history_rounds?: number
  }) => {
    return request<Assistant>('/assistant_api/create', data)
  },

  update: async (data: { id: number } & Partial<{
    name: string
    avatar_url: string
    description: string
    system_prompt: string
    default_model_id: number
    mcp_servers: { id: number }[]
    knowledge_sources: { id: number }[]
    sample_questions: string[]
    history_rounds: number
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

  publish: async (id: number) => {
    return request('/assistant_api/publish', { id })
  },

  unpublish: async (id: number) => {
    return request('/assistant_api/unpublish', { id })
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
  createSource: async (name: string) => {
    return request<UserRagSource>('/rag_api/source/create', { name })
  },

  deleteSource: async (id: number) => {
    return request('/rag_api/source/delete', { id })
  },

  listSources: async () => {
    return request<{ list: UserRagSource[] }>('/rag_api/source/list')
  },

  ingest: async (sourceId: number, text: string) => {
    return request('/rag_api/ingest', { source_id: sourceId, text })
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
  create: async (assistantId: number, title?: string) => {
    const body: any = { assistant_id: assistantId }
    if (title) body.title = title
    return request<Topic>('/topic_api/create', body)
  },

  delete: async (id: number) => {
    return request('/topic_api/delete', { id })
  },

  update: async (id: number, title: string) => {
    return request('/topic_api/update', { id, title })
  },

  list: async (params?: { assistant_id?: number; offset?: number; limit?: number }) => {
    return request<{ list: Topic[]; total: number }>('/topic_api/list', params || {})
  },

  messages: async (topicId: number, limit?: number) => {
    const body: any = { topic_id: topicId }
    if (limit) body.limit = limit
    return request<{ list: TopicMessage[] }>('/topic_api/messages', body)
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
    const url = `${API_BASE_URL}/chat_api/completions`

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

