"use client"

import { useState, useEffect, useCallback } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { memoryAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"
import { PlusIcon, Trash2, Brain, Loader2 } from "lucide-react"
import type { UserMemory } from "@/lib/types"

export default function MemorySettings() {
  const { memoryEnabled, setMemoryEnabled, saveSetting } = useSettingsStore()
  const [memories, setMemories] = useState<UserMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState("")
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadMemories = useCallback(async () => {
    try {
      const result = await memoryAPI.list()
      setMemories(result.list || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMemories() }, [loadMemories])

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
      toast({ title: "记忆已删除" })
    } catch (err: any) {
      toast({ title: "删除失败", description: (err.message || "").slice(0, 80) })
    } finally {
      setDeletingId(null)
    }
  }

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      identity: "身份", preference: "偏好", habit: "习惯",
      plan: "计划", relationship: "关系", other: "其他",
    }
    return map[cat] || cat
  }

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>全局记忆</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <div>
            <SettingRowTitle>启用全局记忆</SettingRowTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">开启后，对话中会自动提取并记住关键信息，在后续对话中智能检索相关记忆作为上下文</p>
          </div>
          <Switch checked={memoryEnabled} onCheckedChange={(c) => { setMemoryEnabled(c); saveSetting("juno_memory_enabled", String(c)) }} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup>
        <SettingTitle>
          记忆条目
          <span className="text-xs font-normal text-muted-foreground ml-2">
            {memories.length} 条记忆
          </span>
        </SettingTitle>
        <p className="text-[11px] text-muted-foreground mt-1 mb-3">
          这些记忆会在对话时通过向量检索自动匹配，也可以手动添加。对话中的关键信息会被自动提取。
        </p>

        <div className="flex gap-2 mb-3">
          <Input
            className="flex-1 glass-input text-[13px]"
            placeholder="手动添加一条记忆..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd() } }}
          />
          <Button size="sm" onClick={handleAdd} disabled={adding || !newContent.trim()}>
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusIcon className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <SettingDivider />

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">加载中...</span>
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Brain className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">暂无记忆</p>
            <p className="text-xs mt-1">开始对话后，关键信息会被自动提取</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {memories.map(m => (
              <div key={m.id} className="group flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-foreground/90 leading-relaxed break-words">{m.content}</p>
                  <span className="text-[11px] text-muted-foreground mt-0.5 inline-block">
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
      </SettingGroup>
    </SettingContainer>
  )
}
