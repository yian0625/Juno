import { create } from 'zustand'
import type { Assistant, UserRagSource, McpServerConfig, AssistantModelProfile, SearchProvider } from '@/lib/types'

interface AssistantEditState {
  editingAssistant: Assistant | null
  editAssistantTab: 'model' | 'prompt' | 'knowledge' | 'mcp' | 'memory' | 'websearch'
  editName: string
  editAvatarUrl: string
  editDescription: string
  editSystemPrompt: string
  isSavingAssistant: boolean

  // Model settings
  allChatModels: AssistantModelProfile[]
  editDefaultModelId: number
  editTemperatureEnabled: boolean
  editTemperature: number[]
  editTopPEnabled: boolean
  editTopP: number[]
  editStreamOutput: boolean
  editImageGenerationEnabled: boolean
  editHistoryRounds: number

  // Web Search
  allSearchProviders: SearchProvider[]
  editWebSearchEngine: string

  // Knowledge / MCP
  allRagSources: UserRagSource[]
  allMcpServers: McpServerConfig[]
  editKnowledgeIds: number[]
  editMcpIds: number[]

  // Memory
  editMemory: string

  // Emoji picker
  emojiPickerAssistantId: number | null

  // Actions
  setEditingAssistant: (a: Assistant | null) => void
  setEditAssistantTab: (tab: AssistantEditState['editAssistantTab']) => void
  setEditName: (name: string) => void
  setEditAvatarUrl: (url: string) => void
  setEditDescription: (desc: string) => void
  setEditSystemPrompt: (prompt: string) => void
  setIsSavingAssistant: (saving: boolean) => void
  setAllChatModels: (models: AssistantModelProfile[]) => void
  setEditDefaultModelId: (id: number) => void
  setEditTemperatureEnabled: (enabled: boolean) => void
  setEditTemperature: (temp: number[]) => void
  setEditTopPEnabled: (enabled: boolean) => void
  setEditTopP: (topP: number[]) => void
  setEditStreamOutput: (stream: boolean) => void
  setEditImageGenerationEnabled: (enabled: boolean) => void
  setEditHistoryRounds: (rounds: number) => void
  setAllSearchProviders: (providers: SearchProvider[]) => void
  setEditWebSearchEngine: (engine: string) => void
  setAllRagSources: (sources: UserRagSource[]) => void
  setAllMcpServers: (servers: McpServerConfig[]) => void
  setEditKnowledgeIds: (ids: number[] | ((prev: number[]) => number[])) => void
  setEditMcpIds: (ids: number[] | ((prev: number[]) => number[])) => void
  setEditMemory: (memory: string) => void
  setEmojiPickerAssistantId: (id: number | null) => void

  resetModelSettings: () => void
  resetAll: () => void
}

export const useAssistantEditStore = create<AssistantEditState>((set) => ({
  editingAssistant: null,
  editAssistantTab: 'model',
  editName: '',
  editAvatarUrl: '',
  editDescription: '',
  editSystemPrompt: '',
  isSavingAssistant: false,
  allChatModels: [],
  editDefaultModelId: 0,
  editTemperatureEnabled: false,
  editTemperature: [0.7],
  editTopPEnabled: false,
  editTopP: [1.0],
  editStreamOutput: true,
  editImageGenerationEnabled: true,
  editHistoryRounds: 10,
  allSearchProviders: [],
  editWebSearchEngine: '',
  allRagSources: [],
  allMcpServers: [],
  editKnowledgeIds: [],
  editMcpIds: [],
  editMemory: '',
  emojiPickerAssistantId: null,

  setEditingAssistant: (a) => set({ editingAssistant: a }),
  setEditAssistantTab: (tab) => set({ editAssistantTab: tab }),
  setEditName: (name) => set({ editName: name }),
  setEditAvatarUrl: (url) => set({ editAvatarUrl: url }),
  setEditDescription: (desc) => set({ editDescription: desc }),
  setEditSystemPrompt: (prompt) => set({ editSystemPrompt: prompt }),
  setIsSavingAssistant: (saving) => set({ isSavingAssistant: saving }),
  setAllChatModels: (models) => set({ allChatModels: models }),
  setEditDefaultModelId: (id) => set({ editDefaultModelId: id }),
  setEditTemperatureEnabled: (enabled) => set({ editTemperatureEnabled: enabled }),
  setEditTemperature: (temp) => set({ editTemperature: temp }),
  setEditTopPEnabled: (enabled) => set({ editTopPEnabled: enabled }),
  setEditTopP: (topP) => set({ editTopP: topP }),
  setEditStreamOutput: (stream) => set({ editStreamOutput: stream }),
  setEditImageGenerationEnabled: (enabled) => set({ editImageGenerationEnabled: enabled }),
  setEditHistoryRounds: (rounds) => set({ editHistoryRounds: rounds }),
  setAllSearchProviders: (providers) => set({ allSearchProviders: providers }),
  setEditWebSearchEngine: (engine) => set({ editWebSearchEngine: engine }),
  setAllRagSources: (sources) => set({ allRagSources: sources }),
  setAllMcpServers: (servers) => set({ allMcpServers: servers }),
  setEditKnowledgeIds: (ids) => set((s) => ({
    editKnowledgeIds: typeof ids === 'function' ? ids(s.editKnowledgeIds) : ids
  })),
  setEditMcpIds: (ids) => set((s) => ({
    editMcpIds: typeof ids === 'function' ? ids(s.editMcpIds) : ids
  })),
  setEditMemory: (memory) => set({ editMemory: memory }),
  setEmojiPickerAssistantId: (id) => set({ emojiPickerAssistantId: id }),

  resetModelSettings: () => set({
    editDefaultModelId: 0,
    editTemperatureEnabled: false,
    editTemperature: [0.7],
    editTopPEnabled: false,
    editTopP: [1.0],
    editStreamOutput: true,
    editHistoryRounds: 10,
    editWebSearchEngine: '',
  }),

  resetAll: () => set({
    editingAssistant: null,
    editAssistantTab: 'model',
    editName: '',
    editAvatarUrl: '',
    editDescription: '',
    editSystemPrompt: '',
    isSavingAssistant: false,
    editDefaultModelId: 0,
    editTemperatureEnabled: false,
    editTemperature: [0.7],
    editTopPEnabled: false,
    editTopP: [1.0],
    editStreamOutput: true,
    editHistoryRounds: 10,
    editWebSearchEngine: '',
    editImageGenerationEnabled: true,
    allSearchProviders: [],
    editKnowledgeIds: [],
    editMcpIds: [],
    editMemory: '',
  }),
}))
