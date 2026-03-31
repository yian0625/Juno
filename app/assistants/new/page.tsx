"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, X } from "lucide-react"
import { assistantAPI, mcpAPI, ragAPI, chatAPI } from "@/lib/api"
import type { McpServerConfig, UserRagSource, Model } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

export default function NewAssistantPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 表单状态
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

  // 下拉数据
  const [models, setModels] = useState<Model[]>([])
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([])
  const [knowledgeSources, setKnowledgeSources] = useState<UserRagSource[]>([])

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    const [modelsRes, mcpRes, ragRes] = await Promise.allSettled([
      chatAPI.getModels(),
      mcpAPI.list(),
      ragAPI.listSources(),
    ])
    if (modelsRes.status === "fulfilled") setModels(modelsRes.value.models || [])
    if (mcpRes.status === "fulfilled") setMcpServers(mcpRes.value.list || [])
    if (ragRes.status === "fulfilled") setKnowledgeSources(ragRes.value.list || [])
  }

  const handleAddQuestion = () => {
    const q = newQuestion.trim()
    if (q && !sampleQuestions.includes(q)) {
      setSampleQuestions([...sampleQuestions, q])
      setNewQuestion("")
    }
  }

  const handleRemoveQuestion = (index: number) => {
    setSampleQuestions(sampleQuestions.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "请输入助手名称" })
      return
    }

    setIsSubmitting(true)
    try {
      const assistant = await assistantAPI.create({
        name: name.trim(),
        avatar_url: avatarUrl || undefined,
        description: description || undefined,
        system_prompt: systemPrompt || undefined,
        default_model_id: defaultModelId || undefined,
        mcp_servers: selectedMcpIds.map((id) => ({ id })),
        knowledge_sources: selectedKnowledgeIds.map((id) => ({ id })),
        sample_questions: sampleQuestions.length > 0 ? sampleQuestions : undefined,
        history_rounds: historyRounds,
      })

      toast({ title: "创建成功", description: `助手「${assistant.name}」已创建` })
      router.push("/")
    } catch (err: any) {
      toast({ title: "创建失败", description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="container flex h-14 items-center gap-3 px-4 mx-auto max-w-3xl">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">创建助手</h1>
        </div>
      </header>

      <main className="container px-4 py-6 mx-auto max-w-3xl space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>助手名称 *</Label>
              <Input
                placeholder="给你的助手起个名字"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>头像 URL</Label>
              <Input
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                placeholder="简要描述这个助手的功能"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* 提示词配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">提示词配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                placeholder="设定助手的行为和角色..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>默认模型</Label>
                <Select
                  value={defaultModelId ? String(defaultModelId) : ""}
                  onValueChange={(v) => setDefaultModelId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>历史对话轮数</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={historyRounds}
                  onChange={(e) => setHistoryRounds(Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 扩展能力 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">扩展能力</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>MCP Server</Label>
              <div className="flex flex-wrap gap-2">
                {mcpServers.map((server) => (
                  <Badge
                    key={server.id}
                    variant={selectedMcpIds.includes(server.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedMcpIds((prev) =>
                        prev.includes(server.id)
                          ? prev.filter((id) => id !== server.id)
                          : [...prev, server.id]
                      )
                    }}
                  >
                    {server.name}
                  </Badge>
                ))}
                {mcpServers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    暂无 MCP Server，
                    <Button variant="link" className="px-1 h-auto" onClick={() => router.push("/mcp")}>
                      去添加
                    </Button>
                  </p>
                )}
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
                    onClick={() => {
                      setSelectedKnowledgeIds((prev) =>
                        prev.includes(source.id)
                          ? prev.filter((id) => id !== source.id)
                          : [...prev, source.id]
                      )
                    }}
                  >
                    {source.name}
                  </Badge>
                ))}
                {knowledgeSources.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    暂无知识库，
                    <Button variant="link" className="px-1 h-auto" onClick={() => router.push("/knowledge")}>
                      去创建
                    </Button>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 示例问题 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">示例问题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="添加一个示例问题"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
              />
              <Button variant="outline" size="icon" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((q, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {q}
                  <button onClick={() => handleRemoveQuestion(i)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 提交 */}
        <div className="flex gap-3 justify-end pb-6">
          <Button variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "创建中..." : "创建助手"}
          </Button>
        </div>
      </main>
    </div>
  )
}
