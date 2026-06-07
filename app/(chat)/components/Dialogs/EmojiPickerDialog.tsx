"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAssistantEditStore, useChatStore } from "@/lib/stores"
import { assistantAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"

export default function EmojiPickerDialog() {
  const { resolvedTheme } = useTheme()
  const { emojiPickerAssistantId, setEmojiPickerAssistantId } = useAssistantEditStore()
  const setAssistants = useChatStore((s) => s.setAssistants)
  const assistants = useChatStore((s) => s.assistants)

  const handleSelect = async (emoji: any) => {
    if (!emojiPickerAssistantId) return
    try {
      await assistantAPI.update({ id: emojiPickerAssistantId, avatar_url: emoji.native })
      setAssistants(assistants.map(a =>
        a.id === emojiPickerAssistantId ? { ...a, avatar_url: emoji.native } : a
      ))
      toast({ title: "图标已更新" })
    } catch (err: any) {
      toast({ title: "更新失败", description: err.message })
    }
    setEmojiPickerAssistantId(null)
  }

  return (
    <Dialog open={!!emojiPickerAssistantId} onOpenChange={(open) => { if (!open) setEmojiPickerAssistantId(null) }}>
      <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-sm font-medium">选择助手图标</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center p-2">
          <Picker
            data={data}
            onEmojiSelect={handleSelect}
            locale="zh"
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            previewPosition="none"
            skinTonePosition="search"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
