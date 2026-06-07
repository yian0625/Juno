"use client"

import { Input } from "@/components/ui/input"
import { PlusIcon, Edit2, Check, X, Trash2, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatStore } from "@/lib/stores"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { topicAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

function formatTopicTime(ts: number): string {
  const d = new Date(ts * 1000)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "昨天"
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

export default function TopicsTab() {
  const topics = useChatStore((s) => s.topics)
  const currentTopicId = useChatStore((s) => s.currentTopicId)
  const currentAssistantId = useChatStore((s) => s.currentAssistantId)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const abortController = useChatStore((s) => s.abortController)
  const editingTopicId = useChatStore((s) => s.editingTopicId)
  const editingTitle = useChatStore((s) => s.editingTitle)
  const currentModel = useChatStore((s) => s.currentModel)
  const showTopicTime = useSettingsStore((s) => s.showTopicTime)
  const setCurrentTopicId = useChatStore((s) => s.setCurrentTopicId)
  const setTopics = useChatStore((s) => s.setTopics)
  const setMessages = useChatStore((s) => s.setMessages)
  const setIsStreaming = useChatStore((s) => s.setIsStreaming)
  const setEditingTopicId = useChatStore((s) => s.setEditingTopicId)
  const setEditingTitle = useChatStore((s) => s.setEditingTitle)
  const setDeletingTopicId = useChatStore((s) => s.setDeletingTopicId)
  const loadMessages = useChatStore((s) => s.loadMessages)

  const handleSelectTopic = (topicId: number) => {
    if (isStreaming) {
      abortController?.abort()
      setIsStreaming(false)
    }
    setCurrentTopicId(topicId)
    loadMessages(topicId)
  }

  const handleNewTopic = async () => {
    if (!currentAssistantId) return
    try {
      const topic = await topicAPI.create(currentAssistantId, undefined, currentModel || undefined)
      setTopics([topic, ...topics])
      setCurrentTopicId(topic.id)
      setMessages([])
    } catch (err: any) {
      toast({ title: "创建话题失败", description: err.message })
    }
  }

  const handleSaveTitle = async (topicId: number) => {
    if (!editingTitle.trim()) return
    try {
      await topicAPI.update(topicId, editingTitle.trim())
      setTopics(topics.map((t) => t.id === topicId ? { ...t, title: editingTitle.trim() } : t))
    } catch {}
    setEditingTopicId(null)
  }

  return (
    <div className="px-2 pt-1 pb-2">
      <button
        onClick={handleNewTopic}
        className="juno-sidebar-new-topic flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg transition-colors mb-1"
      >
        <span className="juno-sidebar-command-icon flex items-center justify-center h-6 w-6 rounded-lg">
          <PlusIcon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate">新对话</span>
      </button>

      {topics.map((topic) => (
        <div
          key={topic.id}
          className={cn(
            "juno-topic-item group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors",
            topic.id === currentTopicId ? "active" : ""
          )}
          onClick={() => handleSelectTopic(topic.id)}
        >
          {editingTopicId === topic.id ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle(topic.id)}
                className="h-6 text-xs"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button onClick={(e) => { e.stopPropagation(); handleSaveTitle(topic.id) }}>
                <Check className="h-3 w-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setEditingTopicId(null) }}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <span className="juno-topic-icon flex items-center justify-center h-6 w-6 rounded-lg shrink-0">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="juno-topic-title block truncate">{topic.title || "新对话"}</span>
                {showTopicTime && topic.update_time && (
                  <span className="juno-topic-time block text-[10px] text-muted-foreground/60 mt-0.5">{formatTopicTime(topic.update_time)}</span>
                )}
              </div>
              <div className="juno-topic-actions hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingTopicId(topic.id)
                    setEditingTitle(topic.title)
                  }}
                  className="p-1 rounded-md hover:text-foreground"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeletingTopicId(topic.id)
                  }}
                  className="p-1 rounded-md hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {!currentAssistantId && (
        <p className="text-xs text-muted-foreground text-center py-8">请先选择一个助手</p>
      )}
    </div>
  )
}
