"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Plus, X, Trash2, Globe, GlobeIcon } from "lucide-react"
import { assistantAPI, mcpAPI, ragAPI, chatAPI } from "@/lib/api"
import type { Assistant, McpServerConfig, UserRagSource, Model } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

export default function EditAssistantPage() {
  const router = useRouter()
  const params = useParams()
  const assistantId = Number(params.id)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [defaultModelId, setDefaultModelId] = useState<number>(0)
  const [selectedMcpIds, setSelectedMcpIds] = useState<number[]>([])
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<number[]>([])
  const [sampleQuestions, setSampleQuestions] = useState<string[]>([])
  const [newQuestion, setNewQuestion] = useState("")
  const [historyRounds, setHistoryRounds] = useState(10)
  const [assistantStatus, setAssistantStatus] = useState(1)

  const [models, setModels] = useState<Model[]>([])
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([])
  const [knowledgeSources, setKnowledgeSources] = useState<UserRagSource[]>([])

  useEffect(() => {
    loadAll()
  }, [assistantId])

  const loadAll = async () => {
    setIsLoading(true)
    try {
      const [assistantRes, modelsRes, mcpRes, ragRes] = await Promise.allSettled([
        assistantAPI.get(assistantId),
        chatAPI.getModels(),
        mcpAPI.list(),
        ragAPI.listSources(),
      ])

      if (modelsRes.status === "fulfilled") setModels(modelsRes.value.models || [])
      if (mcpRes.status === "fulfilled") setMcpServers(mcpRes.value.list || [])
      if (ragRes.status === "fulfilled") setKnowledgeSources(ragRes.value.list || [])

      if (assistantRes.status === "fulfilled") {
        const a = assistantRes.value as Assistant
        setName(a.name)
        setDescription(a.description || "")
        setAvatarUrl(a.avatar_url || "")
        setSystemPrompt(a.system_prompt || "")
        setDefaultModelId(a.default_model_id || 0)
        setSelectedMcpIds((a.mcp_servers || []).map((s) => s.id))
        setSelectedKnowledgeIds((a.knowledge_sources || []).map((s) => s.id))
        setSampleQuestions(a.sample_questions || [])
        setHistoryRounds(a.history_rounds || 10)
        setAssistantStatus(a.status)
      }
    } catch (err) {
      console.error("Failed to load:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddQuestion = () => {
    const q = newQuestion.trim()
    if (q && !sampleQuestions.includes(q)) {
      setSampleQuestions([...sampleQuestions, q])
      setNewQuestion("")
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "请输入助手名称" })
      return
    }

    setIsSubmitting(true)
    try {
      await assistantAPI.update({
        id: assistantId,
        name: name.trim(),
        avatar_url: avatarUrl,
        description,
        system_prompt: systemPrompt,
        default_model_id: defaultModelId || undefined,
        mcp_servers: selectedMcpIds.map((id) => ({ id })),
        knowledge_sources: selectedKnowledgeIds.map((id) => ({ id })),
        sample_questions: sampleQuestions,
        history_rounds: historyRounds,
      })

      toast({ title: "保存成功" })
      router.push("/")
    } catch (err: any) {
      toast({ title: "保存失败", description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await assistantAPI.delete(assistantId)
      toast({ title: "已删除" })
      router.push("/")
    } catch (err: any) {
      toast({ title: "删除失败", description: err.message })
    }
  }

  const handlePublishToggle = async () => {
    try {
      if (assistantStatus === 2) {
        await assistantAPI.unpublish(assistantId)
        setAssistantStatus(1)
        toast({ title: "已下架" })
      } else {
        await assistantAPI.publish(assistantId)
        setAssistantStatus(2)
        toast({ title: "已发布到市场" })
      }
    } catch (err: any) {
      toast({ title: "操作失败", description: err.message })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4 mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">编辑助手</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePublishToggle}>
              <Globe className="h-4 w-4 mr-1" />
              {assistantStatus === 2 ? "下架" : "发布"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除？</AlertDialogTitle>
                  <AlertDialogDescription>
                    删除后助手及相关数据将无法恢复。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 mx-auto max-w-3xl space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>助手名称 *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>头像 URL</Label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* 提示词配置 */}
        <Card>
          <CardHeader><CardTitle className="text-base">提示词配置</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>默认模型</Label>
                <Select value={defaultModelId ? String(defaultModelId) : ""} onValueChange={(v) => setDefaultModelId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="选择模型" /></SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>历史对话轮数</Label>
                <Input type="number" min={0} max={50} value={historyRounds} onChange={(e) => setHistoryRounds(Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 扩展能力 */}
        <Card>
          <CardHeader><CardTitle className="text-base">扩展能力</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>MCP Server</Label>
              <div className="flex flex-wrap gap-2">
                {mcpServers.map((server) => (
                  <Badge
                    key={server.id}
                    variant={selectedMcpIds.includes(server.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedMcpIds((prev) => prev.includes(server.id) ? prev.filter((id) => id !== server.id) : [...prev, server.id])}
                  >
                    {server.name}
                  </Badge>
                ))}
                {mcpServers.length === 0 && <p className="text-sm text-muted-foreground">暂无 MCP Server</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>知识库</Label>
              <div className="flex flex-wrap gap-2">
                {knowledgeSources.map((source) => (
                  <Badge
                    key={source.id}
                    variant={selectedKnowledgeIds.includes(source.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedKnowledgeIds((prev) => prev.includes(source.id) ? prev.filter((id) => id !== source.id) : [...prev, source.id])}
                  >
                    {source.name}
                  </Badge>
                ))}
                {knowledgeSources.length === 0 && <p className="text-sm text-muted-foreground">暂无知识库</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 示例问题 */}
        <Card>
          <CardHeader><CardTitle className="text-base">示例问题</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="添加示例问题"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
              />
              <Button variant="outline" size="icon" onClick={handleAddQuestion}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((q, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {q}
                  <button onClick={() => setSampleQuestions(sampleQuestions.filter((_, j) => j !== i))} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-6">
          <Button variant="outline" onClick={() => router.back()}>取消</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        </div>
      </main>
    </div>
  )
}
