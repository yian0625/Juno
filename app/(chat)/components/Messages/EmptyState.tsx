"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare } from "lucide-react"
import { useChatStore } from "@/lib/stores"
import { isEmojiAvatar } from "@/lib/helpers"

export default function EmptyState() {
  const assistants = useChatStore((s) => s.assistants)
  const currentAssistantId = useChatStore((s) => s.currentAssistantId)
  const currentAssistant = assistants.find((a) => a.id === currentAssistantId)

  if (!currentAssistantId) {
    return (
      <div className="juno-empty-state flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="juno-empty-state-card max-w-md flex flex-col items-center">
          <div className="juno-empty-state-symbol h-16 w-16 mb-5 rounded-2xl flex items-center justify-center">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <p className="text-xl mb-2 font-medium text-foreground">欢迎使用 Juno</p>
          <p className="text-sm text-muted-foreground">从左侧选择一个助手开始对话</p>
        </div>
      </div>
    )
  }

  return (
    <div className="juno-empty-state flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="juno-empty-state-card max-w-md flex flex-col items-center">
        <Avatar className="juno-empty-state-avatar h-16 w-16 mb-4">
          {currentAssistant?.avatar_url && isEmojiAvatar(currentAssistant.avatar_url) ? (
            <AvatarFallback className="text-3xl bg-transparent">{currentAssistant.avatar_url}</AvatarFallback>
          ) : (
            <>
              <AvatarImage src={currentAssistant?.avatar_url} />
              <AvatarFallback className="text-xl">{currentAssistant?.name?.slice(0, 1) || "J"}</AvatarFallback>
            </>
          )}
        </Avatar>
        <p className="text-lg font-medium mb-1 text-foreground">{currentAssistant?.name || "Juno"}</p>
        <p className="text-sm mb-6 text-muted-foreground">{currentAssistant?.description || "有什么可以帮你的？"}</p>
      </div>
    </div>
  )
}
