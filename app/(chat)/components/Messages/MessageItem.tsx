"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Copy, Edit2, RefreshCw, Trash2 } from "lucide-react"
import { useChatStore } from "@/lib/stores"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { isEmojiAvatar, formatTime } from "@/lib/helpers"
import type { ChatMsg } from "@/lib/stores"
import MessageContent from "./MessageContent"

interface Props {
  msg: ChatMsg
  onCopy: (content: string) => void
  onEdit: (msgId: string, content: string) => void
  onRegenerate: (msgId: string) => void
  onDelete: (msgId: string) => void
}

export default function MessageItem({ msg, onCopy, onEdit, onRegenerate, onDelete }: Props) {
  const assistants = useChatStore((s) => s.assistants)
  const currentAssistantId = useChatStore((s) => s.currentAssistantId)
  const allModelProfiles = useChatStore((s) => s.allModelProfiles)
  const user = useChatStore((s) => s.user)
  const editingMsgId = useChatStore((s) => s.editingMsgId)
  const editingMsgContent = useChatStore((s) => s.editingMsgContent)
  const setEditingMsgId = useChatStore((s) => s.setEditingMsgId)
  const setEditingMsgContent = useChatStore((s) => s.setEditingMsgContent)
  const currentAssistant = assistants.find((a) => a.id === currentAssistantId)
  const modelIconType = useSettingsStore((s) => s.modelIconType)
  const messageStyle = useSettingsStore((s) => s.messageStyle)

  const isEditing = editingMsgId === msg.id
  const isAssistant = msg.role === "assistant"

  const handleSaveEdit = () => {
    if (!editingMsgContent.trim()) return
    onEdit(msg.id, editingMsgContent.trim())
  }

  return (
    <div className="juno-message-row group" data-role={msg.role}>
      {/* Header */}
      <div className={`juno-message-header flex items-center gap-3 mb-1.5 ${isAssistant ? "" : "justify-end"}`}>
        <Avatar className="juno-message-avatar h-9 w-9 shrink-0">
        {(() => {
          if (msg.role === "assistant") {
            if (modelIconType === "none") {
              return <AvatarFallback className="text-xs bg-primary/10">{currentAssistant?.name?.slice(0, 1) || "J"}</AvatarFallback>
            }
            if (modelIconType === "emoji") {
              return currentAssistant?.avatar_url && isEmojiAvatar(currentAssistant.avatar_url)
                ? <AvatarFallback className="text-lg bg-transparent">{currentAssistant.avatar_url}</AvatarFallback>
                : <AvatarFallback className="text-lg bg-transparent">🤖</AvatarFallback>
            }
            // iconType === "model" — show model icon (avatar_url image or fallback)
            return currentAssistant?.avatar_url && isEmojiAvatar(currentAssistant.avatar_url) ? (
              <AvatarFallback className="text-lg bg-transparent">{currentAssistant.avatar_url}</AvatarFallback>
            ) : (
              <>
                <AvatarImage src={currentAssistant?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary/10">{currentAssistant?.name?.slice(0, 1) || "J"}</AvatarFallback>
              </>
            )
          }
          return <AvatarFallback className="text-xs bg-muted">{user?.nickname?.slice(0, 1) || "U"}</AvatarFallback>
        })()}
        </Avatar>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-medium text-sm">
            {msg.role === "assistant"
              ? `${currentAssistant?.name || "助手"}${msg.model_alias ? ` | ${allModelProfiles.find((p) => p.chat_model_alias === msg.model_alias)?.name || msg.model_alias}` : ""}`
              : (user?.nickname || "用户")
            }
          </span>
          <span className="text-xs text-muted-foreground">{formatTime(msg.create_time)}</span>
        </div>
      </div>

      {/* Content */}
      <div className={isAssistant ? "pl-12 pr-8" : "flex flex-col items-end pl-16"}>
        {isEditing ? (
          <div className="flex w-full max-w-[720px] flex-col gap-2">
            <textarea
              value={editingMsgContent}
              onChange={(e) => setEditingMsgContent(e.target.value)}
              className="w-full bg-accent rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[60px]"
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                保存
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingMsgId(null)} className="h-7 text-xs">
                取消
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={
              isAssistant
                ? (messageStyle === "bubble" ? "juno-assistant-bubble glass-light p-4 -ml-1" : "")
                : "juno-user-message"
            }
          >
            <MessageContent msg={msg} />
          </div>
        )}

        {/* Actions */}
        {!msg.isStreaming && msg.content && !isEditing && (
            <div className={`juno-message-actions flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity glass-light rounded-md p-1 w-fit ${isAssistant ? "" : "ml-auto"}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => onCopy(msg.content)} className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>复制</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => { setEditingMsgId(msg.id); setEditingMsgContent(msg.content) }} className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>编辑</TooltipContent>
            </Tooltip>
            {msg.role === "assistant" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => onRegenerate(msg.id)} className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>重新生成</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => onDelete(msg.id)} className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>删除</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  )
}
