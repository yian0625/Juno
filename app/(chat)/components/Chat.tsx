"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { useChatStore } from "@/lib/stores"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { agentAPI, topicAPI, type AgentEvent } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import type { ChatMsg } from "@/lib/stores"
import ChatNavBar from "./ChatNavBar"
import MessageList from "./Messages/MessageList"
import Inputbar from "./Inputbar/Inputbar"
import { Button } from "@/components/ui/button"
import { Check, FilePenLine, FolderPlus, ShieldAlert, Terminal, X } from "lucide-react"

interface PendingApproval {
  sessionId: string
  id: string
  name: string
  args: Record<string, any>
  assistantMsgId: string
}

const TOOL_LABELS: Record<string, string> = {
  "__builtin__shell_exec": "执行命令",
  "__builtin__todo_read": "读取任务清单",
  "__builtin__todo_write": "更新任务清单",
  "__builtin__sub_agent": "子 Agent 调研",
  "__builtin__read_file": "读取文件",
  "__builtin__write_file": "写入文件",
  "__builtin__edit_file": "编辑文件",
  "__builtin__multi_edit_file": "批量编辑文件",
  "__builtin__list_files": "列出文件",
  "__builtin__search_files": "搜索文件",
  "__builtin__create_dir": "创建目录",
  "__builtin__undo_file": "撤销文件修改",
  "__builtin__git": "Git 操作",
  "__builtin__fetch_url": "访问网页",
  "__builtin__web_search": "网络搜索",
  "__builtin__workspace_info": "读取工作区信息",
}

function toolLabel(name: string) {
  return TOOL_LABELS[name] || name.replace(/^__builtin__/, "")
}

function toolSummary(name: string, args: Record<string, any>) {
  const value =
    name === "__builtin__shell_exec" ? args.command :
    name === "__builtin__git" ? `git ${args.args || ""}` :
    name === "__builtin__fetch_url" ? args.url :
    name === "__builtin__web_search" ? args.query :
    name === "__builtin__sub_agent" ? args.task :
    name === "__builtin__todo_write" ? `${Array.isArray(args.todos) ? args.todos.length : 0} 项` :
    args.path || args.pattern || ""
  if (!value) return ""
  const text = String(value).replace(/\s+/g, " ").trim()
  return text.length > 96 ? `${text.slice(0, 96)}...` : text
}

function appendAssistantContent(assistantMsgId: string, content: string) {
  if (!content) return
  const store = useChatStore.getState()
  store.setMessages((prev) => {
    const updated = [...prev]
    const idx = updated.findIndex((m) => m.id === assistantMsgId)
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], content: `${updated[idx].content || ""}${content}` }
    }
    return updated
  })
}

function appendAgentStatus(assistantMsgId: string, content: string) {
  appendAssistantContent(assistantMsgId, `\n[[JUNO_AGENT_STATUS]] ${content}`)
}

function resolveAgentProfileId() {
  const store = useChatStore.getState()
  const byAlias = store.allModelProfiles.find((profile) => profile.chat_model_alias === store.currentModel)
  if (byAlias?.id) return byAlias.id
  const assistant = store.assistants.find((item) => item.id === store.currentAssistantId)
  if (assistant?.assistant_model_profile_id) return assistant.assistant_model_profile_id
  return store.allModelProfiles[0]?.id || 0
}

function AgentApprovalPanel({
  approvals,
  onRespond,
}: {
  approvals: PendingApproval[]
  onRespond: (approval: PendingApproval, approved: boolean) => void
}) {
  if (approvals.length === 0) return null
  return (
    <div className="juno-agent-approval-wrap px-6">
      <div className="juno-agent-approval-panel max-w-[900px] mx-auto">
        {approvals.map((approval) => {
          const summary = toolSummary(approval.name, approval.args)
          const isShell = approval.name === "__builtin__shell_exec" || approval.name === "__builtin__git"
          const Icon = isShell ? Terminal : approval.name === "__builtin__create_dir" ? FolderPlus : FilePenLine
          return (
            <div key={approval.id} className="juno-agent-approval-card">
              <div className="flex items-start gap-3 min-w-0">
                <div className="juno-agent-approval-icon">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
                    <span className="text-[13px] font-semibold">等待授权：{toolLabel(approval.name)}</span>
                  </div>
                  {summary && <div className="mt-1 truncate text-[12px] text-muted-foreground">{summary}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="ghost" className="juno-agent-approval-button" onClick={() => onRespond(approval, false)}>
                  <X className="h-3.5 w-3.5" />
                  拒绝
                </Button>
                <Button size="sm" className="juno-agent-approval-button is-primary" onClick={() => onRespond(approval, true)}>
                  <Check className="h-3.5 w-3.5" />
                  允许
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Chat() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])

  // Listen for regenerate events from MessageList
  useEffect(() => {
    const handler = (e: Event) => {
      const { msgId } = (e as CustomEvent).detail
      handleRegenerateMessage(msgId)
    }
    window.addEventListener('regenerate-message', handler)
    return () => window.removeEventListener('regenerate-message', handler)
  }, [])

  const doStream = useCallback(async (
    topicId: number,
    userContent: string,
    assistantMsgId: string,
  ) => {
    const store = useChatStore.getState()

    try {
      const { currentAssistantId, currentModel, selectedWorkspace, agentApprovalMode } = useChatStore.getState()
      const { memoryEnabled, memoryContent } = useSettingsStore.getState()
      const messages: { role: string; content: string }[] = []
      if (memoryEnabled && memoryContent.trim()) {
        messages.push({ role: "system", content: `用户长期记忆：\n${memoryContent.trim()}` })
      }
      messages.push({ role: "user", content: userContent })

      const modelProfileId = resolveAgentProfileId()
      if (!modelProfileId && !currentModel) throw new Error("没有可用的 Agent 模型")

      await new Promise<void>(async (resolve, reject) => {
        let settled = false
        let displayedError = false
        const settle = (fn: () => void) => {
          if (settled) return
          settled = true
          fn()
        }

        try {
          const controller = await agentAPI.run(
            {
              assistant_id: currentAssistantId,
              topic_id: topicId || undefined,
              model_profile_id: modelProfileId,
              model_alias: currentModel,
              approval_mode: agentApprovalMode,
              workspace_enabled: Boolean(selectedWorkspace?.path),
              workspace_path: selectedWorkspace?.path,
              workspace_name: selectedWorkspace?.name,
              messages,
            },
            {
              onEvent: (event: AgentEvent) => {
                if (event.type === "text") {
                  appendAssistantContent(assistantMsgId, event.content)
                } else if (event.type === "tool_start") {
                  const summary = toolSummary(event.name, event.args)
                  appendAgentStatus(assistantMsgId, `Agent 正在${toolLabel(event.name)}${summary ? `：${summary}` : ""}`)
                } else if (event.type === "tool_approval") {
                  setPendingApprovals((prev) => [
                    ...prev.filter((item) => item.id !== event.id),
                    { sessionId: event.session_id, id: event.id, name: event.name, args: event.args, assistantMsgId },
                  ])
                  appendAgentStatus(assistantMsgId, `等待你授权：${toolLabel(event.name)}`)
                } else if (event.type === "tool_end") {
                  const failed = Boolean(event.error)
                  appendAgentStatus(assistantMsgId, `${toolLabel(event.name)}${failed ? "失败" : "完成"}`)
                  setPendingApprovals((prev) => prev.filter((item) => item.id !== event.id))
                } else if (event.type === "workspace_files") {
                  appendAgentStatus(assistantMsgId, `工作区已更新，当前可见文件 ${event.files.length} 个`)
                } else if (event.type === "error") {
                  displayedError = true
                  appendAgentStatus(assistantMsgId, `发送失败：${event.message}`)
                } else if (event.type === "session_title" && topicId) {
                  const topic = useChatStore.getState().topics.find((item) => item.id === topicId)
                  if (!topic?.title) {
                    topicAPI.update(topicId, event.title).catch(() => {})
                    useChatStore.getState().setTopics(
                      useChatStore.getState().topics.map((item) => item.id === topicId ? { ...item, title: event.title } : item)
                    )
                  }
                }
              },
              onDone: () => settle(resolve),
              onError: (message) => settle(() => {
                if (!displayedError) appendAgentStatus(assistantMsgId, `发送失败：${message}`)
                reject(new Error(message))
              }),
            }
          )
          useChatStore.getState().setAbortController(controller)
        } catch (error) {
          settle(() => reject(error))
        }
      })
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "发送失败", description: (err.message || '').slice(0, 80) })
      }
    } finally {
      const store = useChatStore.getState()
      store.setIsStreaming(false)
      store.setAbortController(null)
      store.setMessages((prev) => prev.map((m) => ({ ...m, isStreaming: false })))
      setPendingApprovals([])
      store.loadTopics()
    }
  }, [])

  const handleSendMessage = useCallback(async () => {
    const { inputValue, uploadedFiles, isStreaming, currentAssistantId, currentTopicId, currentModel, topics } = useChatStore.getState()
    const text = inputValue.trim()
    const hasFiles = uploadedFiles.length > 0
    if ((!text && !hasFiles) || isStreaming || !currentAssistantId) return

    let topicId = currentTopicId
    if (!topicId) {
      try {
        const topic = await topicAPI.create(currentAssistantId, undefined, currentModel || undefined)
        topicId = topic.id
        const store = useChatStore.getState()
        store.setCurrentTopicId(topic.id)
        store.setTopics([topic, ...topics])
      } catch (err: any) {
        toast({ title: "创建话题失败", description: err.message })
        return
      }
    }

    let userContent = text
    if (hasFiles) {
      const fileList = uploadedFiles.map(f => `[${f.file_type === 'image' ? '图片' : 'PDF'}: ${f.filename}](${f.url})`).join('\n')
      userContent = fileList + (text ? '\n\n' + text : '')
    }

    const userMsg: ChatMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userContent,
      create_time: Math.floor(Date.now() / 1000),
    }

    const assistantMsgId = `assistant-${Date.now()}`
    const assistantMsg: ChatMsg = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      model_alias: currentModel,
      create_time: Math.floor(Date.now() / 1000),
      isStreaming: true,
    }

    const store = useChatStore.getState()
    store.setMessages((prev) => [...prev, userMsg, assistantMsg])
    store.setInputValue("")
    store.setUploadedFiles([])
    store.setIsStreaming(true)

    if (inputRef.current) {
      inputRef.current.style.height = "auto"
    }

    await doStream(topicId, userContent, assistantMsgId)
  }, [doStream])

  const handleRegenerateMessage = useCallback(async (msgId: string) => {
    const { messages, currentTopicId, currentModel } = useChatStore.getState()
    const msgIndex = messages.findIndex((m) => m.id === msgId)
    if (msgIndex < 0) return
    let userMsgIndex = msgIndex - 1
    while (userMsgIndex >= 0 && messages[userMsgIndex].role !== 'user') userMsgIndex--
    if (userMsgIndex < 0) return
    const userContent = messages[userMsgIndex].content

    const assistantMsgId = `assistant-${Date.now()}`
    const assistantMsg: ChatMsg = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      model_alias: currentModel,
      create_time: Math.floor(Date.now() / 1000),
      isStreaming: true,
    }

    const store = useChatStore.getState()
    store.setMessages((prev) => prev.map((m) => m.id === msgId ? assistantMsg : m))
    store.setIsStreaming(true)

    await doStream(currentTopicId, userContent, assistantMsgId)
  }, [doStream])

  const handleStop = useCallback(() => {
    const { abortController } = useChatStore.getState()
    abortController?.abort()
    const store = useChatStore.getState()
    store.setIsStreaming(false)
    store.setAbortController(null)
    setPendingApprovals([])
  }, [])

  const handleApprovalResponse = useCallback((approval: PendingApproval, approved: boolean) => {
    setPendingApprovals((prev) => prev.filter((item) => item.id !== approval.id))
    appendAgentStatus(approval.assistantMsgId, approved ? `已允许：${toolLabel(approval.name)}` : `已拒绝：${toolLabel(approval.name)}`)
    agentAPI.approve(approval.sessionId, approval.id, approved).catch((err: any) => {
      toast({ title: "授权失败", description: (err?.message || "无法提交授权").slice(0, 80) })
    })
  }, [])

  return (
    <div className="juno-chat-main flex-1 flex flex-col min-w-0">
      <ChatNavBar />
      <div ref={scrollRef} className="juno-chat-scroll flex-1 overflow-y-auto">
        <MessageList scrollRef={scrollRef} />
      </div>
      <AgentApprovalPanel approvals={pendingApprovals} onRespond={handleApprovalResponse} />
      <Inputbar onSend={handleSendMessage} onStop={handleStop} inputRef={inputRef} />
    </div>
  )
}
