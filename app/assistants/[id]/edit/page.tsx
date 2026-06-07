"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Trash2, Globe } from "lucide-react"
import { assistantAPI, mcpAPI, ragAPI, providerAPI } from "@/lib/api"
import type { Assistant, McpServerConfig, UserRagSource } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

interface ChatModelOption {
  id: number
  name: string
}

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

  const [chatModels, setChatModels] = useState<ChatModelOption[]>([])
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
        providerAPI.fetchSystemModelsByType("chat"),
        mcpAPI.list(),
        ragAPI.listSources(),
      ])

      if (modelsRes.status === "fulfilled") setChatModels((modelsRes.value.models || []).map((item) => ({ id: item.id, name: item.display_name })))
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
      }
    } catch (err) {
      console.error("Failed to load:", err)
    } finally {
      setIsLoading(false)
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

  const handleSaveToLibrary = async () => {
    try {
      await assistantAPI.saveToLibrary(assistantId)
      toast({ title: "已保存到我的助手库" })
    } catch (err: any) {
      toast({ title: "操作失败", description: err.message })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-sm font-medium mb-3">{children}</h2>
  )

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSaveToLibrary}>
            <Globe className="h-3.5 w-3.5 mr-1" />
            保存到助手库
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
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
          {/* 基本信息 */}
          <div>
            <SectionTitle>基本信息</SectionTitle>
            <div className="space-y-3 rounded-lg border border-border/50 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs">助手名称 *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">头像 URL</Label>
                <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">描述</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="text-sm" />
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
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">默认聊天模型</Label>
                  <Select value={defaultModelId ? String(defaultModelId) : ""} onValueChange={(v) => {
                    const modelId = Number(v)
                    setDefaultModelId(modelId)
                  }}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择模型" /></SelectTrigger>
                    <SelectContent>
                      {chatModels.map((chatModel) => (
                        <SelectItem key={chatModel.id} value={String(chatModel.id)}>{chatModel.name}</SelectItem>
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
                      onClick={() => setSelectedMcpIds((prev) => prev.includes(server.id) ? prev.filter((id) => id !== server.id) : [...prev, server.id])}
                    >
                      {server.name}
                    </Badge>
                  ))}
                  {mcpServers.length === 0 && <p className="text-xs text-muted-foreground">暂无 MCP Server</p>}
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
                      onClick={() => setSelectedKnowledgeIds((prev) => prev.includes(source.id) ? prev.filter((id) => id !== source.id) : [...prev, source.id])}
                    >
                      {source.name}
                    </Badge>
                  ))}
                  {knowledgeSources.length === 0 && <p className="text-xs text-muted-foreground">暂无知识库</p>}
                </div>
              </div>
            </div>
          </div>


          <div className="flex gap-3 justify-end pb-6">
            <Button variant="outline" size="sm" onClick={() => router.back()}>取消</Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </div>
      </div>
    </div>
  )
}
