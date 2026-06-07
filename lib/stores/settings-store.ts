import { create } from "zustand"
import { settingsAPI } from "@/lib/api"

interface SettingsState {
  // Display
  fontSize: number
  showTopicTime: boolean
  sendWithEnter: boolean
  messageStyle: "bubble" | "plain"
  modelIconType: "model" | "emoji" | "none"

  // Default model
  defaultModel: string
  topicModel: string
  translateModel: string
  defaultTemperature: number
  defaultMaxTokens: string
  defaultTopP: number

  // Web search
  searchEnabled: boolean
  searchEngine: string
  searchApiKey: string

  // Memory
  memoryEnabled: boolean
  memoryContent: string


  // Quick/Selection assistant
  quickAssistantEnabled: boolean
  selectionAssistantEnabled: boolean

  // Internal
  _prefsLoaded: boolean
  _prefs: Record<string, any>

  // Actions
  loadPreferences: () => Promise<void>
  saveSetting: (key: string, value: any) => void
  setFontSize: (v: number) => void
  setShowTopicTime: (v: boolean) => void
  setSendWithEnter: (v: boolean) => void
  setMessageStyle: (v: "bubble" | "plain") => void
  setModelIconType: (v: "model" | "emoji" | "none") => void
  setDefaultModel: (v: string) => void
  setTopicModel: (v: string) => void
  setTranslateModel: (v: string) => void
  setDefaultTemperature: (v: number) => void
  setDefaultMaxTokens: (v: string) => void
  setDefaultTopP: (v: number) => void
  setSearchEnabled: (v: boolean) => void
  setSearchEngine: (v: string) => void
  setSearchApiKey: (v: string) => void
  setMemoryEnabled: (v: boolean) => void
  setMemoryContent: (v: string) => void
  setQuickAssistantEnabled: (v: boolean) => void
  setSelectionAssistantEnabled: (v: boolean) => void
}

const PREF_KEY_MAP: Record<string, string> = {
  juno_font_size: "font_size",
  juno_show_topic_time: "show_topic_time",
  juno_send_with_enter: "send_with_enter",
  juno_message_style: "message_style",
  juno_model_icon_type: "model_icon_type",
  juno_default_model: "default_model",
  juno_topic_model: "topic_model",
  juno_translate_model: "translate_model",
  juno_websearch_enabled: "websearch_enabled",
  juno_websearch_engine: "websearch_engine",
  juno_websearch_api_key: "websearch_api_key",
  juno_memory_enabled: "memory_enabled",
  juno_memory_content: "memory_content",
  juno_quick_assistant: "quick_assistant",
  juno_selection_assistant: "selection_assistant",
  juno_default_temperature: "default_temperature",
  juno_default_max_tokens: "default_max_tokens",
  juno_default_top_p: "default_top_p",
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  fontSize: 14,
  showTopicTime: true,
  sendWithEnter: true,
  messageStyle: "bubble",
  modelIconType: "model",
  defaultModel: "",
  topicModel: "",
  translateModel: "",
  defaultTemperature: 0.7,
  defaultMaxTokens: "4096",
  defaultTopP: 1,
  searchEnabled: false,
  searchEngine: "google",
  searchApiKey: "",
  memoryEnabled: true,
  memoryContent: "",
  quickAssistantEnabled: true,
  selectionAssistantEnabled: true,
  _prefsLoaded: false,
  _prefs: {},

  loadPreferences: async () => {
    if (get()._prefsLoaded) return
    try {
      const prefs = await settingsAPI.getPreferences()
      set({
        _prefs: prefs,
        _prefsLoaded: true,
        ...(prefs.font_size && { fontSize: prefs.font_size }),
        ...(prefs.show_topic_time !== undefined && { showTopicTime: prefs.show_topic_time }),
        ...(prefs.send_with_enter !== undefined && { sendWithEnter: prefs.send_with_enter }),
        ...(prefs.message_style && { messageStyle: prefs.message_style }),
        ...(prefs.model_icon_type && { modelIconType: prefs.model_icon_type }),
        ...(prefs.default_model && { defaultModel: prefs.default_model }),
        ...(prefs.topic_model && { topicModel: prefs.topic_model }),
        ...(prefs.translate_model && { translateModel: prefs.translate_model }),
        ...(prefs.websearch_enabled !== undefined && { searchEnabled: prefs.websearch_enabled }),
        ...(prefs.websearch_engine && { searchEngine: prefs.websearch_engine }),
        ...(prefs.websearch_api_key && { searchApiKey: prefs.websearch_api_key }),
        ...(prefs.memory_enabled !== undefined && { memoryEnabled: prefs.memory_enabled }),
        ...(prefs.memory_content && { memoryContent: prefs.memory_content }),
        ...(prefs.quick_assistant !== undefined && { quickAssistantEnabled: prefs.quick_assistant }),
        ...(prefs.selection_assistant !== undefined && { selectionAssistantEnabled: prefs.selection_assistant }),
        ...(prefs.default_temperature !== undefined && { defaultTemperature: prefs.default_temperature }),
        ...(prefs.default_max_tokens !== undefined && { defaultMaxTokens: String(prefs.default_max_tokens) }),
        ...(prefs.default_top_p !== undefined && { defaultTopP: prefs.default_top_p }),
      })
    } catch {
      // Fallback to localStorage
      const s = (k: string) => localStorage.getItem(k)
      set({
        _prefsLoaded: true,
        ...(s("juno_font_size") && { fontSize: parseInt(s("juno_font_size")!) }),
        ...(s("juno_show_topic_time") !== null && { showTopicTime: s("juno_show_topic_time") === "true" }),
        ...(s("juno_send_with_enter") !== null && { sendWithEnter: s("juno_send_with_enter") === "true" }),
        ...(s("juno_message_style") && { messageStyle: s("juno_message_style") as any }),
        ...(s("juno_default_model") && { defaultModel: s("juno_default_model")! }),
      })
    }
  },

  saveSetting: (key: string, value: any) => {
    localStorage.setItem(key, String(value))
    const prefKey = PREF_KEY_MAP[key]
    if (prefKey) {
      let parsedValue: any = value
      if (value === "true") parsedValue = true
      else if (value === "false") parsedValue = false
      else if (!isNaN(Number(value)) && value !== "") parsedValue = Number(value)
      else { try { parsedValue = JSON.parse(value) } catch {} }
      const prefs = { ...get()._prefs, [prefKey]: parsedValue }
      set({ _prefs: prefs })
      settingsAPI.savePreferences(prefs).catch(() => {})
    }
  },

  setFontSize: (v) => set({ fontSize: v }),
  setShowTopicTime: (v) => set({ showTopicTime: v }),
  setSendWithEnter: (v) => set({ sendWithEnter: v }),
  setMessageStyle: (v) => set({ messageStyle: v }),
  setModelIconType: (v) => set({ modelIconType: v }),
  setDefaultModel: (v) => set({ defaultModel: v }),
  setTopicModel: (v) => set({ topicModel: v }),
  setTranslateModel: (v) => set({ translateModel: v }),
  setDefaultTemperature: (v) => set({ defaultTemperature: v }),
  setDefaultMaxTokens: (v) => set({ defaultMaxTokens: v }),
  setDefaultTopP: (v) => set({ defaultTopP: v }),
  setSearchEnabled: (v) => set({ searchEnabled: v }),
  setSearchEngine: (v) => set({ searchEngine: v }),
  setSearchApiKey: (v) => set({ searchApiKey: v }),
  setMemoryEnabled: (v) => set({ memoryEnabled: v }),
  setMemoryContent: (v) => set({ memoryContent: v }),
  setQuickAssistantEnabled: (v) => set({ quickAssistantEnabled: v }),
  setSelectionAssistantEnabled: (v) => set({ selectionAssistantEnabled: v }),
}))
