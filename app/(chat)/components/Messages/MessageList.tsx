"use client"

import { useRef, useEffect, useState } from "react"
import { useChatStore, useUIStore } from "@/lib/stores"
import { messageAPI } from "@/lib/api"
import { isLocalMessage } from "@/lib/helpers"
import { toast } from "@/hooks/use-toast"
import MessageItem from "./MessageItem"
import EmptyState from "./EmptyState"

interface Props {
  scrollRef: React.RefObject<HTMLDivElement | null>
}

export default function MessageList({ scrollRef }: Props) {
  const messages = useChatStore((s) => s.messages)
  const setMessages = useChatStore((s) => s.setMessages)
  const currentAssistantId = useChatStore((s) => s.currentAssistantId)
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const setEditingMsgId = useChatStore((s) => s.setEditingMsgId)
  const prevCountRef = useRef(0)
  const shouldAutoScroll = useRef(true)
  const isAutoScrolling = useRef(false)

  useEffect(() => {
    prevCountRef.current = 0
    shouldAutoScroll.current = true
  }, [currentAssistantId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      if (isAutoScrolling.current) return
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight
      shouldAutoScroll.current = gap < 100
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollRef])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || messages.length === 0) return

    const prevCount = prevCountRef.current
    const newCount = messages.length
    prevCountRef.current = newCount

    if (prevCount === 0 || shouldAutoScroll.current) {
      isAutoScrolling.current = true
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
        requestAnimationFrame(() => { isAutoScrolling.current = false })
      })
    }
  }, [messages, scrollRef])
  // Scroll to specific message from search
  const { scrollToMessageId, setScrollToMessageId } = useUIStore()
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    if (!scrollToMessageId || messages.length === 0 || isLoadingMessages) return
    // Wait for DOM to render
    requestAnimationFrame(() => {
      const el = document.getElementById(`msg-${scrollToMessageId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightId(scrollToMessageId)
        setTimeout(() => setHighlightId(null), 2000)
      }
      setScrollToMessageId(null)
    })
  }, [scrollToMessageId, messages, isLoadingMessages, setScrollToMessageId])

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({ title: "已复制" })
  }

  const handleEdit = async (msgId: string, content: string) => {
    if (!isLocalMessage(msgId)) {
      try {
        await messageAPI.update(parseInt(msgId), content)
      } catch (err: any) {
        toast({ title: "编辑失败", description: err.message })
        setEditingMsgId(null)
        return
      }
    }
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content } : m))
    setEditingMsgId(null)
    toast({ title: "已保存" })
  }

  const handleDelete = async (msgId: string) => {
    if (isLocalMessage(msgId)) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
      return
    }
    try {
      await messageAPI.delete(parseInt(msgId))
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
      toast({ title: "已删除" })
    } catch (err: any) {
      toast({ title: "删除失败", description: err.message })
    }
  }

  const handleRegenerate = async (msgId: string) => {
    // This is handled by the parent Chat component via streaming logic
    const { handleRegenerateMessage } = useChatStore.getState() as any
    // We'll handle this at the Chat level instead
    window.dispatchEvent(new CustomEvent('regenerate-message', { detail: { msgId } }))
  }

  if (!currentAssistantId || (messages.length === 0 && !isLoadingMessages)) {
    return <EmptyState />
  }

  return (
    <div className="juno-message-list mx-auto w-full max-w-[880px] px-6 pt-5 pb-8 space-y-5">
      {!isLoadingMessages && messages.map((msg) => (
        <div
          key={msg.id}
          id={`msg-${msg.id}`}
          className={`transition-colors duration-700 rounded-lg ${highlightId === msg.id ? 'bg-primary/10 ring-1 ring-primary/20' : ''}`}
        >
          <MessageItem
            msg={msg}
            onCopy={handleCopy}
            onEdit={handleEdit}
            onRegenerate={(msgId) => {
              window.dispatchEvent(new CustomEvent('regenerate-message', { detail: { msgId } }))
            }}
            onDelete={handleDelete}
          />
        </div>
      ))}
    </div>
  )
}
