"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { assistantAPI, mcpAPI, ragAPI, providerAPI } from "@/lib/api"
import type { McpServerConfig, UserRagSource } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

interface ChatModelOption {
  id: number
  name: string
}

export default function NewAssistantPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [defaultModelId, setDefaultModelId] = useState<number>(0)
  const [selectedMcpIds, setSelectedMcpIds] = useState<number[]>([])
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<number[]>([])

  const [chatModels, setChatModels] = useState<ChatModelOption[]>([])
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([])
  const [knowledgeSources, setKnowledgeSources] = useState<UserRagSource[]>([])

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    const [modelsRes, mcpRes, ragRes] = await Promise.allSettled([
      providerAPI.fetchSystemModelsByType("chat"),
      mcpAPI.list(),
      ragAPI.listSources(),
    ])
    if (modelsRes.status === "fulfilled") {
      const models = (modelsRes.value.models || []).map((item) => ({ id: item.id, name: item.display_name }))
      setChatModels(models)
      if (!defaultModelId && models.length > 0) {
        setDefaultModelId(models[0].id)
      }
    }
    if (mcpRes.status === "fulfilled") setMcpServers(mcpRes.value.list || [])
    if (ragRes.status === "fulfilled") setKnowledgeSources(ragRes.value.list || [])
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
      })

      toast({ title: "创建成功", description: `助手「${assistant.name}」已创建` })
      router.push("/")
    } catch (err: any) {
      toast({ title: "创建失败", description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-sm font-medium mb-3">{children}</h2>
  )

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
          {/* 基本信息 */}
          <div>
            <SectionTitle>基本信息</SectionTitle>
            <div className="space-y-3 rounded-lg border border-border/50 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs">助手名称 *</Label>
                <Input
                  placeholder="给你的助手起个名字"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">头像 URL</Label>
                <Input
                  placeholder="https://..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">描述</Label>
                <Textarea
                  placeholder="简要描述这个助手的功能"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* 提示词配置 */}
          <div>
            <SectionTitle>提示词配置</SectionTitle>
            <div className="space-y-3 rounded-lg border border-border/50 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs">System Prompt</Label>
                <Textarea
                  placeholder="设定助手的行为和角色..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">默认聊天模型</Label>
                  <Select
                    value={defaultModelId ? String(defaultModelId) : ""}
                    onValueChange={(v) => {
                      const modelId = Number(v)
                      setDefaultModelId(modelId)
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {chatModels.map((chatModel) => (
                        <SelectItem key={chatModel.id} value={String(chatModel.id)}>
                          {chatModel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

            </div>
          </div>
          </div>
          {/* 扩展能力 */}
          <div>
            <SectionTitle>扩展能力</SectionTitle>
            <div className="space-y-4 rounded-lg border border-border/50 p-4">
              <div className="space-y-2">
                <Label className="text-xs">MCP Server</Label>
                <div className="flex flex-wrap gap-1.5">
                  {mcpServers.map((server) => (
                    <Badge
                      key={server.id}
                      variant={selectedMcpIds.includes(server.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
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
                    <p className="text-xs text-muted-foreground">
                      暂无 MCP Server，
                      <Button variant="link" className="px-1 h-auto text-xs" onClick={() => router.push("/mcp")}>
                        去添加
                      </Button>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">知识库</Label>
                <div className="flex flex-wrap gap-1.5">
                  {knowledgeSources.map((source) => (
                    <Badge
                      key={source.id}
                      variant={selectedKnowledgeIds.includes(source.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
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
                    <p className="text-xs text-muted-foreground">
                      暂无知识库，
                      <Button variant="link" className="px-1 h-auto text-xs" onClick={() => router.push("/knowledge")}>
                        去创建
                      </Button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* 提交 */}
          <div className="flex gap-3 justify-end pb-6">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              取消
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "创建中..." : "创建助手"}
            </Button>
          </div>
      </div>
    </div>
  )
}
