"use client"

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useChatStore } from "@/lib/stores"
import { topicAPI, assistantAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

export function DeleteTopicDialog() {
  const deletingTopicId = useChatStore((s) => s.deletingTopicId)
  const setDeletingTopicId = useChatStore((s) => s.setDeletingTopicId)
  const topics = useChatStore((s) => s.topics)
  const setTopics = useChatStore((s) => s.setTopics)
  const currentTopicId = useChatStore((s) => s.currentTopicId)
  const setCurrentTopicId = useChatStore((s) => s.setCurrentTopicId)
  const setMessages = useChatStore((s) => s.setMessages)
  const loadMessages = useChatStore((s) => s.loadMessages)

  const handleDelete = async () => {
    if (!deletingTopicId) return
    try {
      await topicAPI.delete(deletingTopicId)
      setTopics(topics.filter((t) => t.id !== deletingTopicId))
      if (currentTopicId === deletingTopicId) {
        const remaining = topics.filter((t) => t.id !== deletingTopicId)
        if (remaining.length > 0) {
          setCurrentTopicId(remaining[0].id)
          loadMessages(remaining[0].id)
        } else {
          setCurrentTopicId(0)
          setMessages([])
        }
      }
    } catch (err: any) {
      toast({ title: "删除失败", description: err.message })
    } finally {
      setDeletingTopicId(null)
    }
  }

  return (
    <AlertDialog open={!!deletingTopicId} onOpenChange={(open) => !open && setDeletingTopicId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除对话？</AlertDialogTitle>
          <AlertDialogDescription>删除后对话记录将无法恢复。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function DeleteAssistantDialog() {
  const deletingAssistantId = useChatStore((s) => s.deletingAssistantId)
  const setDeletingAssistantId = useChatStore((s) => s.setDeletingAssistantId)
  const currentAssistantId = useChatStore((s) => s.currentAssistantId)
  const setCurrentAssistantId = useChatStore((s) => s.setCurrentAssistantId)
  const setCurrentTopicId = useChatStore((s) => s.setCurrentTopicId)
  const setMessages = useChatStore((s) => s.setMessages)
  const setTopics = useChatStore((s) => s.setTopics)
  const loadAssistants = useChatStore((s) => s.loadAssistants)

  const handleDelete = async () => {
    if (!deletingAssistantId) return
    try {
      await assistantAPI.delete(deletingAssistantId)
      toast({ title: "已删除" })
      if (currentAssistantId === deletingAssistantId) {
        setCurrentAssistantId(0)
        setCurrentTopicId(0)
        setMessages([])
        setTopics([])
      }
      loadAssistants()
    } catch (err: any) {
      toast({ title: "删除失败", description: err.message })
    } finally {
      setDeletingAssistantId(null)
    }
  }

  return (
    <AlertDialog open={!!deletingAssistantId} onOpenChange={(open) => !open && setDeletingAssistantId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除助手？</AlertDialogTitle>
          <AlertDialogDescription>删除后该助手及其所有话题将无法恢复。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
