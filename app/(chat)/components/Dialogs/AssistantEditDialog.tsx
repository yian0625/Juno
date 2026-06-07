"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlusIcon, X, Trash2, RotateCcw, HelpCircle, Smile,
  BookOpen, Server, Database, Loader2, Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatStore, useUIStore, useAssistantEditStore } from "@/lib/stores"
import { assistantAPI, ragAPI, memoryAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { isEmojiAvatar } from "@/lib/helpers"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"
import { useTheme } from "next-themes"
import type { UserMemory } from "@/lib/types"
export default function AssistantEditDialog() {
  const { assistantDialogOpen, setAssistantDialogOpen } = useUIStore()
  const loadAssistants = useChatStore((s) => s.loadAssistants)
  const selectAssistant = useChatStore((s) => s.selectAssistant)
  const es = useAssistantEditStore()

  const close = () => {
    setAssistantDialogOpen(false)
    es.setEditingAssistant(null)
  }

  const handleSave = async () => {
    if (!es.editName.trim()) {
      toast({ title: "请输入助手名称" })
      return
    }
    es.setIsSavingAssistant(true)
    const payload = {
      name: es.editName.trim(),
      avatar_url: es.editAvatarUrl || undefined,
      description: es.editDescription,
      system_prompt: es.editSystemPrompt,
      assistant_model_profile_id: es.editDefaultModelId || undefined,
      knowledge_sources: es.editKnowledgeIds.map(id => ({ id })),
      mcp_servers: es.editMcpIds.map(id => ({ id })),
      group_id: es.editingAssistant?.group_id || 0,
      image_generation_enabled: es.editImageGenerationEnabled ? 1 : 0,
      history_rounds: es.editHistoryRounds,
      web_search_engine: es.editWebSearchEngine || undefined,
    }
    try {
      if (es.editingAssistant) {
        await assistantAPI.update({ id: es.editingAssistant.id, ...payload })
        toast({ title: "已保存" })
      } else {
        const newAssistant = await assistantAPI.create(payload)
        toast({ title: "助手已创建" })
        selectAssistant(newAssistant.id)
      }
      close()
      loadAssistants()
    } catch (err: any) {
      toast({ title: es.editingAssistant ? "保存失败" : "创建失败", description: (err.message || '未知错误').slice(0, 80) })
    } finally {
      es.setIsSavingAssistant(false)
    }
  }


  const tabs = [
    { key: "model" as const, label: "模型设置" },
    { key: "prompt" as const, label: "提示词设置" },
    { key: "knowledge" as const, label: "知识库设置" },
    { key: "mcp" as const, label: "MCP 服务器" },
    { key: "websearch" as const, label: "网络搜索" },
    { key: "memory" as const, label: "全局记忆" },
  ]

  return (
    <Dialog open={assistantDialogOpen} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="sm:max-w-[880px] p-0 gap-0 overflow-hidden" showCloseButton={true}>
        <DialogHeader className="px-5 py-3.5 border-b border-white/[0.08] dark:border-white/[0.06]">
          <DialogTitle className="text-base font-medium">
            {es.editingAssistant ? es.editingAssistant.name : "新建助手"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex" style={{ height: "65vh" }}>
          {/* Left menu */}
          <div className="w-[180px] border-r border-white/[0.08] dark:border-white/[0.06] py-3 shrink-0" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {tabs.map(item => (
              <button
                key={item.key}
                className={cn(
                  "w-full text-left px-4 py-2 text-[13px] transition-all duration-150 relative",
                  es.editAssistantTab === item.key
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground/80"
                )}
                onClick={() => es.setEditAssistantTab(item.key)}
              >
                {es.editAssistantTab === item.key && (
                  <span className="absolute inset-x-2 inset-y-0.5 rounded-lg" style={{ background: 'var(--glass-bg-hover)', boxShadow: 'var(--glass-inset-highlight)', border: '1px solid var(--glass-border-subtle)' }} />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Right panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {es.editAssistantTab === "model" && (
              <ModelSettingsPanel />
            )}
            {es.editAssistantTab === "prompt" && <PromptSettingsPanel />}
            {es.editAssistantTab === "knowledge" && <KnowledgeSettingsPanel />}
            {es.editAssistantTab === "mcp" && <McpSettingsPanel />}
            {es.editAssistantTab === "websearch" && <WebSearchSettingsPanel />}
            {es.editAssistantTab === "memory" && <MemorySettingsPanel />}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/[0.08] dark:border-white/[0.06]">
          <Button variant="outline" size="sm" onClick={close}>取消</Button>
          <Button size="sm" onClick={handleSave} disabled={es.isSavingAssistant}>
            {es.isSavingAssistant ? (es.editingAssistant ? "保存中..." : "创建中...") : (es.editingAssistant ? "保存" : "创建")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ModelSettingsPanel() {
  const es = useAssistantEditStore()
  const selectedDefaultModel = es.allChatModels.find(profile => profile.id === es.editDefaultModelId)
  const groupedModels = es.allChatModels.reduce<Record<string, typeof es.allChatModels>>((acc, profile) => {
    const key = profile.provider_type || "其他"
    if (!acc[key]) acc[key] = []
    acc[key].push(profile)
    return acc
  }, {})

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium">默认聊天模型</label>
          {selectedDefaultModel && (
            <span className="text-xs text-muted-foreground truncate">
              当前默认模型：{selectedDefaultModel.name}
            </span>
          )}
        </div>
        <Select
          value={es.editDefaultModelId ? String(es.editDefaultModelId) : ""}
          onValueChange={(value) => {
            const modelId = Number(value) || 0
            es.setEditDefaultModelId(modelId)
          }}
        >
          <SelectTrigger className="w-full h-9 glass-input"><SelectValue placeholder="选择默认模型" /></SelectTrigger>
          <SelectContent>
            {Object.entries(groupedModels).map(([groupName, profiles]) => (
              <SelectGroup key={groupName}>
                <SelectLabel>{groupName}</SelectLabel>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={String(profile.id)}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>


      <ToggleSliderSetting
        label="创意度" tooltip="模型温度 (Temperature)：控制回复的随机性，值越高回复越有创意和多样性，值越低越精准和稳定"
        enabled={es.editTemperatureEnabled} onToggle={es.setEditTemperatureEnabled}
        value={es.editTemperature} onChange={es.setEditTemperature}
        min={0} max={2} step={0.1}
        labels={["0", es.editTemperature[0].toFixed(1), "2"]}
      />

      <ToggleSliderSetting
        label="词汇范围" tooltip="Top-P (核采样)：控制候选词的筛选范围，值越大模型可选的词汇越多，值越小回复越集中和确定"
        enabled={es.editTopPEnabled} onToggle={es.setEditTopPEnabled}
        value={es.editTopP} onChange={es.setEditTopP}
        min={0} max={1} step={0.05}
        labels={["0", es.editTopP[0].toFixed(2), "1"]}
      />

      <div className="space-y-2">
        <LabelWithTooltip label="历史轮数" tooltip="对话时加载的历史消息轮数，一轮 = 一条用户消息 + 一条 AI 回复。值越大上下文越丰富，但 token 消耗越高" />
        <div className="pl-1 pr-1">
          <Slider value={[es.editHistoryRounds]} onValueChange={(v) => es.setEditHistoryRounds(v[0])} min={1} max={50} step={1} />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1</span><span>{es.editHistoryRounds} 轮</span><span>50</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">流式输出</span>
        <Switch checked={es.editStreamOutput} onCheckedChange={es.setEditStreamOutput} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">图片生成</span>
          <p className="text-xs text-muted-foreground mt-0.5">开启后，对话中可以通过自然语言生成图片</p>
        </div>
        <Switch checked={es.editImageGenerationEnabled} onCheckedChange={es.setEditImageGenerationEnabled} />
      </div>

      <div className="flex justify-start pt-1">
        <Button variant="outline" size="sm" onClick={es.resetModelSettings} className="text-destructive border-destructive/30 hover:bg-destructive/10">
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />重置模型设置
        </Button>
      </div>
    </>
  )
}

function PromptSettingsPanel() {
  const es = useAssistantEditStore()
  const { resolvedTheme } = useTheme()
  const [emojiOpen, setEmojiOpen] = useState(false)
  const hasEmoji = es.editAvatarUrl && isEmojiAvatar(es.editAvatarUrl)

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">助手名称</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEmojiOpen(!emojiOpen)}
            className="flex items-center justify-center h-9 w-9 shrink-0 rounded-lg transition-colors text-lg glass-input"
          >
            {hasEmoji ? es.editAvatarUrl : <Smile className="h-4 w-4 text-muted-foreground" />}
          </button>
          <Input className="flex-1 glass-input" value={es.editName} onChange={(e) => es.setEditName(e.target.value)} placeholder="助手名称" />
        </div>
        {emojiOpen && (
          <div
            className="rounded-xl border border-[var(--glass-border)] overflow-hidden shadow-[var(--glass-shadow)]"
            onWheel={(e) => e.stopPropagation()}
          >
            <Picker
              data={data}
              onEmojiSelect={(emoji: any) => { es.setEditAvatarUrl(emoji.native); setEmojiOpen(false) }}
              locale="zh"
              theme={resolvedTheme === "dark" ? "dark" : "light"}
              previewPosition="none"
              skinTonePosition="search"
            />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">助手描述</label>
        <Input className="glass-input" value={es.editDescription} onChange={(e) => es.setEditDescription(e.target.value)} placeholder="简要描述助手的功能（可选）" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">助手提示词</label>
        <textarea
          className="w-full min-h-[240px] rounded-md px-3 py-2 text-sm resize-y focus:outline-none glass-input"
          value={es.editSystemPrompt}
          onChange={(e) => es.setEditSystemPrompt(e.target.value)}
          placeholder="输入助手提示词，定义助手的角色和行为..."
        />
      </div>
    </>
  )
}

function KnowledgeSettingsPanel() {
  const es = useAssistantEditStore()
  const router = useRouter()
  const { setAssistantDialogOpen } = useUIStore()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const updatePipelineField = useCallback(async (sourceId: number, field: string, value: boolean) => {
    const source = es.allRagSources.find(s => s.id === sourceId)
    if (!source) return
    setSaving(true)
    try {
      const newConfig = { ...source.pipeline_config, [field]: value }
      await ragAPI.updateSource(sourceId, { pipeline_config: newConfig })
      // Update local state
      es.setAllRagSources(es.allRagSources.map(s => s.id === sourceId ? { ...s, pipeline_config: newConfig } : s))
    } catch (e: any) {
      toast({ title: "保存失败", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }, [es])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium">关联知识库</h3>
          <p className="text-xs text-muted-foreground mt-0.5">选择助手可以检索的知识源</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setAssistantDialogOpen(false); es.setEditingAssistant(null); router.push("/knowledge") }}>
          <PlusIcon className="h-3.5 w-3.5 mr-1" />管理知识库
        </Button>
      </div>
      {es.allRagSources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">暂无知识库</p>
          <p className="text-xs mt-1">请先在知识库页面创建知识源</p>
        </div>
      ) : (
        <div className="space-y-2">
          {es.allRagSources.map(source => {
            const isLinked = es.editKnowledgeIds.includes(source.id)
            const isExpanded = expandedId === source.id && isLinked
            const cfg = source.pipeline_config
            return (
              <div key={source.id} className={cn("rounded-xl border transition-colors overflow-hidden", isLinked ? "border-primary/40 bg-primary/5" : "border-[var(--glass-border-subtle)] bg-black/[0.02] dark:bg-white/[0.03]")} >
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                    isLinked ? "bg-primary/5" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  )}
                  onClick={() => {
                    if (isLinked) {
                      setExpandedId(expandedId === source.id ? null : source.id)
                    } else {
                      es.setEditKnowledgeIds(prev => [...prev, source.id])
                      setExpandedId(source.id)
                    }
                  }}
                >
                  <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", isLinked ? "bg-primary/10" : "bg-black/[0.04] dark:bg-white/[0.06]")}>
                    <Database className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{source.name}</p></div>
                  <Switch
                    checked={isLinked}
                    onCheckedChange={(checked) => {
                      es.setEditKnowledgeIds(prev => checked ? [...prev, source.id] : prev.filter(id => id !== source.id))
                      if (!checked) setExpandedId(null)
                      else setExpandedId(source.id)
                    }}
                  />
                </div>
                {isExpanded && cfg && (
                  <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-[var(--glass-border-subtle)] bg-black/[0.02] dark:bg-white/[0.02]" onClick={e => e.stopPropagation()}>
                    <p className="text-xs text-muted-foreground font-medium">检索策略</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">混合检索</span>
                        <Tooltip><TooltipTrigger asChild><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent side="top"><p className="text-xs max-w-[200px]">同时使用向量语义搜索和 BM25 关键词搜索，通过 RRF 融合排序，提升召回质量</p></TooltipContent></Tooltip>
                      </div>
                      <Switch checked={cfg.hybrid_search} disabled={saving} onCheckedChange={(v) => updatePipelineField(source.id, 'hybrid_search', v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">查询重写</span>
                        <Tooltip><TooltipTrigger asChild><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent side="top"><p className="text-xs max-w-[200px]">让大模型根据对话上下文自动改写用户查询，解决代词指代和上下文依赖问题</p></TooltipContent></Tooltip>
                      </div>
                      <Switch checked={cfg.query_rewrite} disabled={saving} onCheckedChange={(v) => updatePipelineField(source.id, 'query_rewrite', v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">重排序</span>
                        <Tooltip><TooltipTrigger asChild><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent side="top"><p className="text-xs max-w-[200px]">使用 Reranker 模型对检索结果精排，过滤低质量片段，提升上下文相关性</p></TooltipContent></Tooltip>
                      </div>
                      <Switch checked={cfg.rerank} disabled={saving} onCheckedChange={(v) => updatePipelineField(source.id, 'rerank', v)} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function McpSettingsPanel() {
  const es = useAssistantEditStore()
  const router = useRouter()
  const { setAssistantDialogOpen } = useUIStore()
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium">关联 MCP 服务器</h3>
          <p className="text-xs text-muted-foreground mt-0.5">选择助手可以调用的工具服务器</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setAssistantDialogOpen(false); es.setEditingAssistant(null); router.push("/mcp") }}>
          <PlusIcon className="h-3.5 w-3.5 mr-1" />管理服务器
        </Button>
      </div>
      {es.allMcpServers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Server className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">暂无 MCP 服务器</p>
          <p className="text-xs mt-1">请先在小程序页面添加服务器</p>
        </div>
      ) : (
        <div className="space-y-2">
          {es.allMcpServers.map(server => (
            <div
              key={server.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                es.editMcpIds.includes(server.id) ? "border-primary/40 bg-primary/5" : "border-[var(--glass-border-subtle)] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              )}
              onClick={() => es.setEditMcpIds(prev => prev.includes(server.id) ? prev.filter(id => id !== server.id) : [...prev, server.id])}
            >
              <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", es.editMcpIds.includes(server.id) ? "bg-primary/10" : "bg-black/[0.04] dark:bg-white/[0.06]")}>
                <Server className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{server.name}</p>
                <p className="text-xs text-muted-foreground truncate">{server.url}</p>
              </div>
              <div className="flex items-center gap-2">
                {server.tools && server.tools.length > 0 && <span className="text-xs text-muted-foreground">{server.tools.length} 工具</span>}
                <Switch
                  checked={es.editMcpIds.includes(server.id)}
                  onCheckedChange={(checked) => es.setEditMcpIds(prev => checked ? [...prev, server.id] : prev.filter(id => id !== server.id))}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function WebSearchSettingsPanel() {
  const es = useAssistantEditStore()
  const hasProviders = es.allSearchProviders.length > 0
  return (
    <>
      <div className="mb-3">
        <h3 className="text-sm font-medium">网络搜索</h3>
        <p className="text-xs text-muted-foreground mt-0.5">开启后，助手可以通过搜索引擎获取实时信息</p>
      </div>
      {!hasProviders ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <HelpCircle className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">暂无可用搜索引擎</p>
          <p className="text-xs mt-1">请先在后台管理中添加搜索服务</p>
        </div>
      ) : (
        <div className="space-y-2">
          {es.allSearchProviders.map(p => {
            const isSelected = es.editWebSearchEngine === p.provider_type
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  isSelected ? "border-primary/40 bg-primary/5" : "border-[var(--glass-border-subtle)] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                )}
                onClick={() => es.setEditWebSearchEngine(isSelected ? '' : p.provider_type)}
              >
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", isSelected ? "bg-primary/10" : "bg-black/[0.04] dark:bg-white/[0.06]")}>
                  {p.icon_url ? <img src={p.icon_url} className="h-4 w-4" alt="" /> : <span className="text-xs font-medium">{p.name.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.provider_type}</p>
                </div>
                <Switch
                  checked={isSelected}
                  onCheckedChange={(checked) => es.setEditWebSearchEngine(checked ? p.provider_type : '')}
                />
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
function MemorySettingsPanel() {
  const [memories, setMemories] = useState<UserMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState("")
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    memoryAPI.list().then(r => setMemories(r.list || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    const content = newContent.trim()
    if (!content) return
    setAdding(true)
    try {
      const result = await memoryAPI.create(content)
      setMemories(prev => [result.memory, ...prev])
      setNewContent("")
      toast({ title: "记忆已添加" })
    } catch (err: any) {
      toast({ title: "添加失败", description: (err.message || "").slice(0, 80) })
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await memoryAPI.delete(id)
      setMemories(prev => prev.filter(m => m.id !== id))
    } catch (err: any) {
      toast({ title: "删除失败", description: (err.message || "").slice(0, 80) })
    } finally {
      setDeletingId(null)
    }
  }

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = { identity: "身份", preference: "偏好", habit: "习惯", plan: "计划", relationship: "关系", other: "其他" }
    return map[cat] || cat
  }

  return (
    <>
      <div className="mb-3">
        <h3 className="text-sm font-medium">全局记忆</h3>
        <p className="text-xs text-muted-foreground mt-0.5">对话中的关键信息会被自动提取并向量化存储，在后续对话中智能检索匹配。</p>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 h-8 rounded-md px-3 text-[13px] glass-input"
          placeholder="手动添加一条记忆..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
        />
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={adding || !newContent.trim()} className="h-8 px-2">
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusIcon className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">加载中...</span>
        </div>
      ) : memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Brain className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">暂无记忆</p>
          <p className="text-xs mt-1">开始对话后，关键信息会被自动提取</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[calc(65vh-200px)] overflow-y-auto">
          {memories.map(m => (
            <div key={m.id} className="group flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-foreground/90 leading-relaxed break-words">{m.content}</p>
                <span className="text-[11px] text-muted-foreground">
                  {categoryLabel(m.category)}
                  {m.create_time > 0 && (" · " + new Date(m.create_time * 1000).toLocaleDateString())}
                </span>
              </div>
              <button
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(m.id)}
                disabled={deletingId === m.id}
              >
                {deletingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mt-3">{memories.length} 条记忆</p>
    </>
  )
}

// Helper components
function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <Tooltip>
        <TooltipTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  )
}

function ToggleSliderSetting({
  label, tooltip, enabled, onToggle, value, onChange, min, max, step, labels,
}: {
  label: string; tooltip: string; enabled: boolean; onToggle: (v: boolean) => void
  value: number[]; onChange: (v: number[]) => void; min: number; max: number; step: number
  labels: string[]
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <LabelWithTooltip label={label} tooltip={tooltip} />
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && (
        <div className="pl-1 pr-1">
          <Slider value={value} onValueChange={onChange} min={min} max={max} step={step} />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            {labels.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}
