"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  PlusIcon, PanelLeft, PanelLeftClose, Send, Square,
  Moon, Sun, Edit2, Check, X, Settings, Trash2,
  MoreVertical, Copy, RefreshCw, Server, Database,
  LogOut, ChevronRight, MessageSquare, Home, Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { assistantAPI, topicAPI, chatAPI, getUser, getToken, removeToken, removeUser } from "@/lib/api"
import type { Assistant, Topic, TopicMessage, Model } from "@/lib/types"
import { useTheme } from "next-themes"
import { toast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ChatMsg {
  id: string
  role: "user" | "assistant"
  content: string
  model_alias?: string
  create_time?: number
  isStreaming?: boolean
}

export default function MainPage() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const user = typeof window !== "undefined" ? getUser() : null

  // 侧边栏
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<"assistants" | "topics">("assistants")

  // 数据
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [currentAssistantId, setCurrentAssistantId] = useState<number>(0)
  const [topics, setTopics] = useState<Topic[]>([])
  const [currentTopicId, setCurrentTopicId] = useState<number>(0)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [currentModel, setCurrentModel] = useState<string>("")

  // 输入 & 流
  const [inputValue, setInputValue] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoadingAssistants, setIsLoadingAssistants] = useState(true)

  // 话题编辑 / 删除
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deletingTopicId, setDeletingTopicId] = useState<number | null>(null)
  const [deletingAssistantId, setDeletingAssistantId] = useState<number | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // 初始化
  useEffect(() => {
    loadAssistants()
    loadModels()
  }, [])

  const loadAssistants = async () => {
    setIsLoadingAssistants(true)
    try {
      const result = await assistantAPI.list()
      const list = result.list || []
      setAssistants(list)
      if (list.length > 0 && !currentAssistantId) {
        selectAssistant(list[0].id)
      }
    } catch (err: any) {
      toast({ title: "加载助手失败", description: err.message })
    } finally {
      setIsLoadingAssistants(false)
    }
  }

  const loadModels = async () => {
    try {
      const result = await chatAPI.getModels()
      const modelList = result.models || []
      setModels(modelList)
      if (modelList.length > 0) setCurrentModel(modelList[0].alias)
    } catch {}
  }

  const selectAssistant = async (assistantId: number) => {
    if (isStreaming) {
      abortRef.current?.abort()
      setIsStreaming(false)
    }
    setCurrentAssistantId(assistantId)
    setCurrentTopicId(0)
    setMessages([])
    setSidebarTab("topics")

    // 加载话题列表
    try {
      const result = await topicAPI.list({ assistant_id: assistantId })
      const topicList = result.list || []
      setTopics(topicList)
      if (topicList.length > 0) {
        setCurrentTopicId(topicList[0].id)
        loadMessages(topicList[0].id)
      }
    } catch {}
  }

  const loadTopics = async () => {
    if (!currentAssistantId) return
    try {
      const result = await topicAPI.list({ assistant_id: currentAssistantId })
      setTopics(result.list || [])
    } catch {}
  }

  const loadMessages = async (topicId: number) => {
    setIsLoadingMessages(true)
    try {
      const result = await topicAPI.messages(topicId)
      const msgs: ChatMsg[] = (result.list || []).map((m: TopicMessage) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
        model_alias: m.model_alias,
        create_time: m.create_time,
      }))
      setMessages(msgs)
    } catch {
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 50)
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const handleSelectTopic = (topicId: number) => {
    if (isStreaming) {
      abortRef.current?.abort()
      setIsStreaming(false)
    }
    setCurrentTopicId(topicId)
    loadMessages(topicId)
  }

  const handleNewTopic = async () => {
    if (!currentAssistantId) return
    try {
      const topic = await topicAPI.create(currentAssistantId)
      setTopics((prev) => [topic, ...prev])
      setCurrentTopicId(topic.id)
      setMessages([])
    } catch (err: any) {
      toast({ title: "创建话题失败", description: err.message })
    }
  }

  const handleDeleteTopic = async () => {
    if (!deletingTopicId) return
    try {
      await topicAPI.delete(deletingTopicId)
      setTopics((prev) => prev.filter((t) => t.id !== deletingTopicId))
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

  const handleDeleteAssistant = async () => {
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

  const handleSaveTitle = async (topicId: number) => {
    if (!editingTitle.trim()) return
    try {
      await topicAPI.update(topicId, editingTitle.trim())
      setTopics((prev) => prev.map((t) => t.id === topicId ? { ...t, title: editingTitle.trim() } : t))
    } catch {}
    setEditingTopicId(null)
  }

  const handleSendMessage = async () => {
    const text = inputValue.trim()
    if (!text || isStreaming || !currentAssistantId) return

    let topicId = currentTopicId
    if (!topicId) {
      try {
        const topic = await topicAPI.create(currentAssistantId)
        topicId = topic.id
        setCurrentTopicId(topic.id)
        setTopics((prev) => [topic, ...prev])
      } catch (err: any) {
        toast({ title: "创建话题失败", description: err.message })
        return
      }
    }

    const userMsg: ChatMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      create_time: Math.floor(Date.now() / 1000),
    }

    const assistantMsg: ChatMsg = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      model_alias: currentModel,
      create_time: Math.floor(Date.now() / 1000),
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInputValue("")
    setIsStreaming(true)

    // 重置 textarea 高度
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = getToken()
      if (!token) throw new Error("未登录")

      const apiUrl = ''
      const response = await fetch(`${apiUrl}/chat_api/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          topic_id: topicId,
          assistant_id: currentAssistantId,
          model: currentModel || undefined,
          messages: [{ role: "user", content: text }],
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith("data:")) continue
          const dataStr = trimmed.slice(5).trim()

          if (dataStr === "[DONE]") break

          try {
            const parsed = JSON.parse(dataStr)
            if (parsed.error) {
              toast({ title: "错误", description: parsed.error.message || "AI 响应出错" })
              break
            }
            if (parsed.content) {
              accumulated += parsed.content
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: accumulated }
                }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "发送失败", description: err.message })
      }
    } finally {
      setIsStreaming(false)
      setMessages((prev) => prev.map((m) => ({ ...m, isStreaming: false })))
      loadTopics()
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({ title: "已复制" })
  }

  const handleLogout = () => {
    removeToken()
    removeUser()
    router.push("/login")
  }

  const currentAssistant = assistants.find((a) => a.id === currentAssistantId)

  const formatTime = (ts?: number) => {
    if (!ts) return ""
    const d = new Date(ts * 1000)
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col h-screen">
      {/* TOP NAV BAR - NEW */}
      <div className="glass-header flex items-center justify-between h-11 px-4 shrink-0">
        {/* Left: sidebar toggle + Juno logo */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <h1 className="font-serif text-xl font-bold italic tracking-wide text-foreground">Juno</h1>
        </div>
        
        {/* Center-left: 首页/智能体 tabs */}
        <div className="flex items-center gap-6 flex-1 ml-6">
          <button className="relative py-2.5 text-sm font-medium text-foreground transition-colors flex items-center gap-1.5">
            <Home className="h-4 w-4" />
            首页
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
          </button>
          <button 
            className="relative py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            onClick={() => router.push("/assistants/new")}
          >
            <Bot className="h-4 w-4" />
            智能体
          </button>
        </div>

        {/* Right: MCP, Knowledge, Theme, Logout */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/mcp")}>
                <Server className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>MCP 服务</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/knowledge")}>
                <Database className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>知识库</TooltipContent>
          </Tooltip>
          {mounted && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                  {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>切换主题</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>退出登录</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* 左侧栏 */}
        <div
          className={cn(
            "glass-sidebar flex flex-col transition-all duration-200 shrink-0",
            sidebarOpen ? "w-[280px]" : "w-0 overflow-hidden"
          )}
        >

          {/* 助手 / 话题 切换 Tab */}
          <div className="flex border-b border-[var(--glass-border-subtle)] shrink-0">
            <button
              className={cn(
                "flex-1 py-2.5 text-sm font-medium text-center relative transition-colors",
                sidebarTab === "assistants" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setSidebarTab("assistants")}
            >
              助手
              {sidebarTab === "assistants" && (
                <span className="absolute bottom-0 left-[15%] right-[15%] h-[2px] bg-emerald-500 rounded-full" />
              )}
            </button>
            <button
              className={cn(
                "flex-1 py-2.5 text-sm font-medium text-center relative transition-colors",
                sidebarTab === "topics" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setSidebarTab("topics")}
            >
              话题
              {sidebarTab === "topics" && (
                <span className="absolute bottom-0 left-[15%] right-[15%] h-[2px] bg-emerald-500 rounded-full" />
              )}
            </button>
          </div>

          {/* 侧栏内容 */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === "assistants" ? (
              <div className="p-2">
                {/* 添加助手按钮 */}
                <button
                  onClick={() => router.push("/assistants/new")}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-[var(--glass-bg-light)] rounded-md transition-colors mb-1"
                >
                  <PlusIcon className="h-4 w-4" />
                  添加助手
                </button>

                {/* 助手列表 */}
                {assistants.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer group transition-colors",
                      a.id === currentAssistantId ? "bg-[var(--glass-bg-heavy)] border-l-2 border-emerald-500" : "hover:bg-[var(--glass-bg-light)] border-l-2 border-transparent"
                    )}
                    onClick={() => selectAssistant(a.id)}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={a.avatar_url} />
                      <AvatarFallback className="text-xs">{a.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm truncate">{a.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-accent rounded transition-opacity">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/assistants/${a.id}/edit`)}>
                          <Edit2 className="h-3.5 w-3.5 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingAssistantId(a.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {isLoadingAssistants && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2">
                {/* 当前助手信息 */}
                {currentAssistant && (
                  <div className="flex items-center gap-2 px-3 py-2 mb-2 border-b border-[var(--glass-border-subtle)]">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={currentAssistant.avatar_url} />
                      <AvatarFallback className="text-xs">{currentAssistant.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{currentAssistant.name}</span>
                  </div>
                )}

                {/* 新建话题 */}
                <button
                  onClick={handleNewTopic}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-[var(--glass-bg-light)] rounded-md transition-colors mb-1"
                >
                  <PlusIcon className="h-4 w-4" />
                  新对话
                </button>

                {/* 话题列表 */}
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
                      topic.id === currentTopicId ? "bg-[var(--glass-bg-heavy)] border-l-2 border-emerald-500" : "hover:bg-[var(--glass-bg-light)] border-l-2 border-transparent"
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
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{topic.title || "新对话"}</span>
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTopicId(topic.id)
                              setEditingTitle(topic.title)
                            }}
                            className="p-0.5 hover:text-foreground"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingTopicId(topic.id)
                            }}
                            className="p-0.5 hover:text-destructive"
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
            )}
          </div>

          {/* 底部用户信息 */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-t border-[var(--glass-border-subtle)] shrink-0 hover:bg-[var(--glass-bg-light)] rounded-lg mx-2 mb-2 cursor-pointer transition-colors group">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-violet-500 to-indigo-600 text-white">{user?.nickname?.slice(0, 1) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.nickname || "用户"}</p>
              <p className="text-xs text-muted-foreground truncate">在线</p>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

        </div>

        {/* 右侧聊天区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 聊天顶栏 */}
          <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              {currentAssistant && (
                <div className="flex items-center gap-2 min-w-0 text-sm">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={currentAssistant.avatar_url} />
                    <AvatarFallback className="text-xs">{currentAssistant.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium truncate">{currentAssistant.name}</span>
                  {currentModel && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground truncate">{models.find((m) => m.alias === currentModel)?.name || currentModel}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {models.length > 0 && (
                <Select value={currentModel} onValueChange={setCurrentModel}>
                  <SelectTrigger className="h-7 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.alias}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {currentAssistant && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/assistants/${currentAssistantId}/edit`)}>
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 消息区 */}
          <div className="flex-1 overflow-y-auto">
            {!currentAssistantId ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-6 opacity-50 text-emerald-500" />
                <p className="text-xl mb-2 font-medium text-foreground">欢迎使用 Juno</p>
                <p className="text-sm">从左侧选择一个助手开始对话</p>
              </div>
            ) : messages.length === 0 && !isLoadingMessages ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Avatar className="h-16 w-16 mb-4">
                  <AvatarImage src={currentAssistant?.avatar_url} />
                  <AvatarFallback className="text-xl">{currentAssistant?.name?.slice(0, 1) || "J"}</AvatarFallback>
                </Avatar>
                <p className="text-lg font-medium mb-1">{currentAssistant?.name || "Juno"}</p>
                <p className="text-sm mb-6">{currentAssistant?.description || "有什么可以帮你的？"}</p>
                {currentAssistant?.sample_questions && currentAssistant.sample_questions.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {currentAssistant.sample_questions.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setInputValue(q)
                          inputRef.current?.focus()
                        }}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : isLoadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto px-6 py-4 space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className="group">
                    {/* 头像 + 名称 + 时间 */}
                    <div className="flex items-center gap-3 mb-1.5">
                      <Avatar className="h-9 w-9 shrink-0">
                        {msg.role === "assistant" ? (
                          <>
                            <AvatarImage src={currentAssistant?.avatar_url} />
                            <AvatarFallback className="text-xs bg-primary/10">{currentAssistant?.name?.slice(0, 1) || "J"}</AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback className="text-xs bg-muted">{user?.nickname?.slice(0, 1) || "U"}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-medium text-sm">
                          {msg.role === "assistant"
                            ? `${currentAssistant?.name || "助手"}${msg.model_alias ? ` | ${msg.model_alias}` : ""}`
                            : (user?.nickname || "用户")
                          }
                        </span>
                        <span className="text-xs text-muted-foreground">{formatTime(msg.create_time)}</span>
                      </div>
                    </div>

                    {/* 消息内容 */}
                    <div className="pl-12">
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content || (msg.isStreaming ? "" : "")}
                          </ReactMarkdown>
                          {msg.isStreaming && !msg.content && (
                            <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse" />
                          )}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      )}

                      {/* 操作按钮（助手消息） */}
                      {msg.role === "assistant" && !msg.isStreaming && msg.content && (
                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleCopyMessage(msg.content)}
                                className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>复制</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>重新生成</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>删除</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 输入区 */}
          {currentAssistantId > 0 && (
            <div className="px-6 pb-4 shrink-0">
              <div className="glass rounded-2xl max-w-4xl mx-auto p-4">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="在这里输入消息，按 Enter 发送"
                  rows={1}
                  className="w-full bg-transparent resize-none px-2 py-1 text-sm focus:outline-none min-h-[24px] max-h-[160px] placeholder:text-muted-foreground/50"
                  style={{ height: "auto", overflow: "hidden" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = "auto"
                    target.style.height = Math.min(target.scrollHeight, 160) + "px"
                  }}
                  disabled={isStreaming}
                />
                <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/30">
                  <div></div>
                  {isStreaming ? (
                    <Button size="icon" variant="destructive" onClick={handleStop} className="shrink-0 rounded-full h-8 w-8">
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || !currentAssistantId}
                      className={cn(
                        "shrink-0 rounded-full h-8 w-8 transition-colors",
                        inputValue.trim() && currentAssistantId ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""
                      )}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 删除话题确认 */}
      <AlertDialog open={!!deletingTopicId} onOpenChange={(open) => !open && setDeletingTopicId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除对话？</AlertDialogTitle>
            <AlertDialogDescription>删除后对话记录将无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTopic}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除助手确认 */}
      <AlertDialog open={!!deletingAssistantId} onOpenChange={(open) => !open && setDeletingAssistantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除助手？</AlertDialogTitle>
            <AlertDialogDescription>删除后该助手及其所有话题将无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssistant}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
