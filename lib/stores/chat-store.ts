import { create } from 'zustand'
import type { Assistant, Topic, AssistantModelProfile, SearchMessageItem, Model } from '@/lib/types'
import { assistantAPI, topicAPI, messageAPI, providerAPI, chatAPI, getUser, getToken } from '@/lib/api'
import { useSettingsStore } from './settings-store'

function isAvailableModel(model: string | undefined, chatModels: Model[]): model is string {
  if (!model) return false
  if (chatModels.length === 0) return true
  return chatModels.some((item) => item.alias === model)
}

/** Resolve model with fallback: topic -> assistant -> global default -> first Hub chat model */
function resolveModel(topicModel?: string, assistantModel?: string, chatModels: Model[] = []): string {
  const defaultModel = useSettingsStore.getState().defaultModel
  const candidates = [topicModel, assistantModel, defaultModel]
  const available = candidates.find((model) => isAvailableModel(model, chatModels))
  return available || chatModels[0]?.alias || ''
}

export interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  model_alias?: string
  create_time?: number
  isStreaming?: boolean
}

export interface UploadedFile {
  url: string
  filename: string
  file_type: string
  size: number
}

export type AgentApprovalMode = 'ask' | 'auto' | 'full' | 'readonly'

export interface AgentWorkspace {
  path: string
  name: string
}

interface ChatState {
  // User
  user: any

  // Data
  assistants: Assistant[]
  currentAssistantId: number
  topics: Topic[]
  currentTopicId: number
  messages: ChatMsg[]
  currentModel: string
  chatModels: Model[]
  allModelProfiles: AssistantModelProfile[]
  selectedWorkspace: AgentWorkspace | null
  agentApprovalMode: AgentApprovalMode

  // Input
  inputValue: string
  isStreaming: boolean
  isLoadingMessages: boolean
  isLoadingAssistants: boolean
  uploadedFiles: UploadedFile[]
  isUploading: boolean

  // Chat params
  chatTemperature: number[]
  chatMaxTokens: string
  chatTopP: number[]
  showChatParams: boolean

  // Search
  searchResults: SearchMessageItem[]
  isSearching: boolean

  // Edit state
  editingTopicId: number | null
  editingTitle: string
  deletingTopicId: number | null
  deletingAssistantId: number | null
  editingMsgId: string | null
  editingMsgContent: string

  // AbortController ref
  abortController: AbortController | null

  // Actions
  setUser: (user: any) => void
  setAssistants: (assistants: Assistant[]) => void
  setCurrentAssistantId: (id: number) => void
  setTopics: (topics: Topic[]) => void
  setCurrentTopicId: (id: number) => void
  setMessages: (messages: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])) => void
  setCurrentModel: (model: string) => void
  changeCurrentModel: (model: string) => Promise<void>
  setChatModels: (models: Model[]) => void
  setAllModelProfiles: (profiles: AssistantModelProfile[]) => void
  setSelectedWorkspace: (workspace: AgentWorkspace | null) => void
  setAgentApprovalMode: (mode: AgentApprovalMode) => void
  setInputValue: (value: string) => void
  setIsStreaming: (streaming: boolean) => void
  setIsLoadingMessages: (loading: boolean) => void
  setIsLoadingAssistants: (loading: boolean) => void
  setUploadedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void
  setIsUploading: (uploading: boolean) => void
  setChatTemperature: (temp: number[]) => void
  setChatMaxTokens: (tokens: string) => void
  setChatTopP: (topP: number[]) => void
  setShowChatParams: (show: boolean) => void
  setSearchResults: (results: SearchMessageItem[]) => void
  setIsSearching: (searching: boolean) => void
  setEditingTopicId: (id: number | null) => void
  setEditingTitle: (title: string) => void
  setDeletingTopicId: (id: number | null) => void
  setDeletingAssistantId: (id: number | null) => void
  setEditingMsgId: (id: string | null) => void
  setEditingMsgContent: (content: string) => void
  setAbortController: (controller: AbortController | null) => void

  // Async actions
  loadAssistants: () => Promise<void>
  loadChatModels: () => Promise<void>
  loadAllModelProfiles: () => Promise<void>
  selectAssistant: (assistantId: number) => Promise<void>
  loadTopics: () => Promise<void>
  loadMessages: (topicId: number) => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  user: null,
  assistants: [],
  currentAssistantId: 0,
  topics: [],
  currentTopicId: 0,
  messages: [],
  currentModel: '',
  chatModels: [],
  allModelProfiles: [],
  selectedWorkspace: null,
  agentApprovalMode: typeof window !== 'undefined'
    ? ((localStorage.getItem('juno_agent_approval_mode') as AgentApprovalMode | null) || 'ask')
    : 'ask',
  inputValue: '',
  isStreaming: false,
  isLoadingMessages: false,
  isLoadingAssistants: true,
  uploadedFiles: [],
  isUploading: false,
  chatTemperature: [0.7],
  chatMaxTokens: '4096',
  chatTopP: [1.0],
  showChatParams: false,
  searchResults: [],
  isSearching: false,
  editingTopicId: null,
  editingTitle: '',
  deletingTopicId: null,
  deletingAssistantId: null,
  editingMsgId: null,
  editingMsgContent: '',
  abortController: null,

  setUser: (user) => set({ user }),
  setAssistants: (assistants) => set({ assistants }),
  setCurrentAssistantId: (id) => set({ currentAssistantId: id }),
  setTopics: (topics) => set({ topics }),
  setCurrentTopicId: (id) => set({ currentTopicId: id }),
  setMessages: (messages) => set((s) => ({
    messages: typeof messages === 'function' ? messages(s.messages) : messages
  })),
  setCurrentModel: (model) => set({ currentModel: model }),
  setChatModels: (models) => set({ chatModels: models }),
  changeCurrentModel: async (model) => {
    set({ currentModel: model })
    const { currentTopicId, topics } = get()
    if (!currentTopicId) return
    try {
      await topicAPI.update(currentTopicId, { selected_model_alias: model })
      set({
        topics: topics.map((topic) => topic.id === currentTopicId ? { ...topic, selected_model_alias: model } : topic)
      })
    } catch {}
  },
  setAllModelProfiles: (profiles) => set({ allModelProfiles: profiles }),
  setSelectedWorkspace: (workspace) => set({ selectedWorkspace: workspace }),
  setAgentApprovalMode: (mode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('juno_agent_approval_mode', mode)
    }
    set({ agentApprovalMode: mode })
  },
  setInputValue: (value) => set({ inputValue: value }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setIsLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
  setIsLoadingAssistants: (loading) => set({ isLoadingAssistants: loading }),
  setUploadedFiles: (files) => set((s) => ({
    uploadedFiles: typeof files === 'function' ? files(s.uploadedFiles) : files
  })),
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  setChatTemperature: (temp) => set({ chatTemperature: temp }),
  setChatMaxTokens: (tokens) => set({ chatMaxTokens: tokens }),
  setChatTopP: (topP) => set({ chatTopP: topP }),
  setShowChatParams: (show) => set({ showChatParams: show }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (searching) => set({ isSearching: searching }),
  setEditingTopicId: (id) => set({ editingTopicId: id }),
  setEditingTitle: (title) => set({ editingTitle: title }),
  setDeletingTopicId: (id) => set({ deletingTopicId: id }),
  setDeletingAssistantId: (id) => set({ deletingAssistantId: id }),
  setEditingMsgId: (id) => set({ editingMsgId: id }),
  setEditingMsgContent: (content) => set({ editingMsgContent: content }),
  setAbortController: (controller) => set({ abortController: controller }),

  loadAssistants: async () => {
    set({ isLoadingAssistants: true })
    try {
      const result = await assistantAPI.list()
      const list = result.list || []
      set({ assistants: list })
      const { currentAssistantId, selectAssistant } = get()
      if (!currentAssistantId || !list.some(a => a.id === currentAssistantId)) {
        if (list.length > 0) {
          await selectAssistant(list[0].id)
        }
      }
    } catch {
    } finally {
      set({ isLoadingAssistants: false })
    }
  },

  loadChatModels: async () => {
    try {
      const result = await chatAPI.getModels()
      const models = result.models || []
      set({ chatModels: models })
      const { currentModel } = get()
      if ((!currentModel || !isAvailableModel(currentModel, models)) && models.length > 0) {
        set({ currentModel: models[0].alias })
      }
    } catch {}
  },

  loadAllModelProfiles: async () => {
    try {
      const result = await providerAPI.listAssistantModelProfiles()
      const profiles = result.list || []
      set({ allModelProfiles: profiles })
      const { currentAssistantId, assistants, currentModel, chatModels } = get()
      const currentAssistant = assistants.find((a) => a.id === currentAssistantId)
      if (!currentModel) {
        const fallbackModel = resolveModel(undefined, currentAssistant?.default_model_alias, chatModels)
        if (fallbackModel) {
          set({ currentModel: fallbackModel })
        }
      }
    } catch {}
  },

  selectAssistant: async (assistantId: number) => {
    const { isStreaming, abortController } = get()
    if (isStreaming) {
      abortController?.abort()
      set({ isStreaming: false })
    }
    set({ currentAssistantId: assistantId, currentTopicId: 0, messages: [] })
    try {
      const result = await topicAPI.list({ assistant_id: assistantId })
      const topicList = result.list || []
      const { assistants, chatModels } = get()
      const assistant = assistants.find((a) => a.id === assistantId)
      set({ topics: topicList, currentModel: resolveModel(undefined, assistant?.default_model_alias, chatModels) })
      if (topicList.length > 0) {
        set({ currentTopicId: topicList[0].id, currentModel: resolveModel(topicList[0].selected_model_alias, assistant?.default_model_alias, chatModels) })
        get().loadMessages(topicList[0].id)
      }
    } catch {}
  },

  loadTopics: async () => {
    const { currentAssistantId } = get()
    if (!currentAssistantId) return
    try {
      const result = await topicAPI.list({ assistant_id: currentAssistantId })
      set({ topics: result.list || [] })
    } catch {}
  },

  loadMessages: async (topicId: number) => {
    set({ isLoadingMessages: true })
    try {
      const result = await topicAPI.messages(topicId)
      const msgs: ChatMsg[] = (result.list || []).map((m: any) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
        model_alias: m.model_alias,
        create_time: m.create_time,
      }))
      const { topics, assistants, currentAssistantId, chatModels } = get()
      const topic = topics.find((item) => item.id === topicId)
      const assistant = assistants.find((item) => item.id === currentAssistantId)
      set({
        messages: msgs,
        currentModel: resolveModel(topic?.selected_model_alias, assistant?.default_model_alias, chatModels),
      })
    } catch {
    } finally {
      set({ isLoadingMessages: false })
    }
  },
}))
