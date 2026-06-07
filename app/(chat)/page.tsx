"use client"

import { useEffect } from "react"
import { useChatStore, useUIStore } from "@/lib/stores"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { getUser, topicAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import Sidebar from "./components/Sidebar"
import Chat from "./components/Chat"
import SearchDialog from "./components/Dialogs/SearchDialog"
import { DeleteTopicDialog, DeleteAssistantDialog } from "./components/Dialogs/DeleteDialogs"
import AssistantEditDialog from "./components/Dialogs/AssistantEditDialog"
import EmojiPickerDialog from "./components/Dialogs/EmojiPickerDialog"

export default function MainPage() {
  const setUser = useChatStore((s) => s.setUser)
  const loadAssistants = useChatStore((s) => s.loadAssistants)
  const loadChatModels = useChatStore((s) => s.loadChatModels)
  const loadAllModelProfiles = useChatStore((s) => s.loadAllModelProfiles)
  const abortController = useChatStore((s) => s.abortController)
  const { setSearchOpen } = useUIStore()

  // Ctrl+K shortcut
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [setSearchOpen])

  useEffect(() => {
    const handleNewTopic = async () => {
      const store = useChatStore.getState()
      const { currentAssistantId, currentModel, isStreaming, abortController } = store
      if (!currentAssistantId) return

      if (isStreaming) {
        abortController?.abort()
        store.setIsStreaming(false)
      }

      try {
        const topic = await topicAPI.create(currentAssistantId, undefined, currentModel || undefined)
        const nextStore = useChatStore.getState()
        nextStore.setTopics([topic, ...nextStore.topics])
        nextStore.setCurrentTopicId(topic.id)
        nextStore.setMessages([])
        useUIStore.getState().setSidebarTab('topics')
      } catch (err: any) {
        toast({ title: "创建话题失败", description: err.message })
      }
    }

    const handleMenuAction = (event: Event) => {
      const action = (event as CustomEvent<{ action?: string }>).detail?.action
      if (action === 'open-search') {
        setSearchOpen(true)
        return
      }
      if (action === 'new-topic') {
        void handleNewTopic()
      }
    }

    window.addEventListener('juno-menu-action', handleMenuAction)
    return () => window.removeEventListener('juno-menu-action', handleMenuAction)
  }, [setSearchOpen])

  // Initialize
  useEffect(() => {
    try { setUser(getUser()) } catch {}
    loadChatModels()
    loadAssistants()
    loadAllModelProfiles()
    useSettingsStore.getState().loadPreferences().then(() => {
      const s = useSettingsStore.getState()
      const cs = useChatStore.getState()
      if (s.defaultModel && !cs.currentModel) cs.setCurrentModel(s.defaultModel)
      cs.setChatTemperature([s.defaultTemperature])
      cs.setChatMaxTokens(s.defaultMaxTokens)
      cs.setChatTopP([s.defaultTopP])
    })
    return () => { abortController?.abort() }
  }, [])

  return (
    <>
      <div className="juno-chat-shell flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />
        <Chat />
      </div>

      {/* Dialogs */}
      <SearchDialog />
      <DeleteTopicDialog />
      <DeleteAssistantDialog />
      <AssistantEditDialog />
      <EmojiPickerDialog />
    </>
  )
}
