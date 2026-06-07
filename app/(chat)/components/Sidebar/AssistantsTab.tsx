"use client"

import { useMemo, useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  PlusIcon, Edit2, Check, MoreVertical, Copy, Trash2,
  Smile, Tags, ArrowDownAZ, ArrowUpZA, Save, Eraser, FolderPlus, ChevronDown, ChevronRight, List, LayoutGrid,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatStore, useUIStore, useAssistantEditStore } from "@/lib/stores"
import { isEmojiAvatar } from "@/lib/helpers"
import { assistantAPI, assistantGroupAPI, topicAPI, ragAPI, mcpAPI, providerAPI, searchProviderAPI } from "@/lib/api"
import type { AssistantGroup } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

export default function AssistantsTab() {
  const router = useRouter()
  const assistants = useChatStore((s) => s.assistants)
  const currentAssistantId = useChatStore((s) => s.currentAssistantId)
  const selectAssistant = useChatStore((s) => s.selectAssistant)
  const setTopics = useChatStore((s) => s.setTopics)
  const setCurrentTopicId = useChatStore((s) => s.setCurrentTopicId)
  const setMessages = useChatStore((s) => s.setMessages)
  const loadAssistants = useChatStore((s) => s.loadAssistants)
  const setDeletingAssistantId = useChatStore((s) => s.setDeletingAssistantId)
  const allModelProfiles = useChatStore((s) => s.allModelProfiles)
  const {
    assistantIconType, setAssistantIconType,
    assistantSortOrder, setAssistantSortOrder,
    assistantListMode, setAssistantListMode,
    setAssistantDialogOpen, setSidebarTab,
  } = useUIStore()
  const editStore = useAssistantEditStore()
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [addingGroupInline, setAddingGroupInline] = useState(false)
  const [addingGroupForAssistantId, setAddingGroupForAssistantId] = useState<number | null>(null)
  const [newGroupName, setNewGroupName] = useState("")
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editingGroupValue, setEditingGroupValue] = useState("")
  const [groupActionKey, setGroupActionKey] = useState<string | null>(null)
  const dropdownOpenRef = useRef(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set())

  const sortedAssistants = useMemo(() => {
    if (assistantSortOrder === "default") return assistants
    return [...assistants].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'zh-CN')
      return assistantSortOrder === "pinyin-asc" ? cmp : -cmp
    })
  }, [assistants, assistantSortOrder])

  const [groups, setGroups] = useState<AssistantGroup[]>([])

  const loadGroups = useCallback(async () => {
    try {
      const result = await assistantGroupAPI.list()
      setGroups(result.list || [])
    } catch {}
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  /** Find model icon_url by model alias */
  const getModelIcon = (assistant: typeof assistants[number]) => {
    const alias = assistant.default_model_alias
    if (!alias) return undefined
    const model = allModelProfiles.find((profile) => profile.chat_model_alias === alias)
    return model?.chat_model_icon_url || undefined
  }

  const buildAssistantUpdatePayload = (assistant: typeof assistants[number], overrides: Partial<{ group_id: number }>) => ({
    id: assistant.id,
    name: assistant.name,
    avatar_url: assistant.avatar_url || undefined,
    description: assistant.description,
    system_prompt: assistant.system_prompt,
    default_model_id: assistant.default_model_id || undefined,
    assistant_model_profile_id: assistant.assistant_model_profile_id || undefined,
    mcp_servers: (assistant.mcp_servers || []).map((m) => ({ id: m.id })),
    knowledge_sources: (assistant.knowledge_sources || []).map((k) => ({ id: k.id })),
    sample_questions: assistant.sample_questions || [],
    history_rounds: assistant.history_rounds,
    group_id: assistant.group_id || 0,
    ...overrides,
  })

  const updateAssistantGroup = async (assistantId: number, groupId: number) => {
    const assistant = assistants.find((item) => item.id === assistantId)
    if (!assistant) return
    try {
      await assistantAPI.update(buildAssistantUpdatePayload(assistant, { group_id: groupId }))
      await loadAssistants()
    } catch (err: any) {
      toast({ title: "设置分组失败", description: err.message })
    }
  }

  const submitNewGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    try {
      const created = await assistantGroupAPI.create(name)
      await loadGroups()
      if (addingGroupForAssistantId) {
        await updateAssistantGroup(addingGroupForAssistantId, created.id)
      }
      toast({ title: `已创建分组「${name}」` })
    } catch (err: any) {
      toast({ title: "创建分组失败", description: err.message })
    }
    setNewGroupName("")
    setAddingGroupInline(false)
    setAddingGroupForAssistantId(null)
  }

  const startRenameGroup = (groupId: number, groupName: string) => {
    setEditingGroupId(groupId)
    setEditingGroupValue(groupName)
  }

  const cancelRenameGroup = () => {
    setEditingGroupId(null)
    setEditingGroupValue("")
  }

  const renameGroup = async (groupId: number, _fromName: string, toName: string) => {
    const nextName = toName.trim()
    if (!nextName) {
      toast({ title: "分组名称不能为空" })
      return
    }
    setGroupActionKey(`rename:${groupId}`)
    try {
      await assistantGroupAPI.update(groupId, { name: nextName })
      await loadGroups()
      toast({ title: `已重命名分组` })
      cancelRenameGroup()
    } catch (err: any) {
      toast({ title: "重命名分组失败", description: err.message })
    } finally {
      setGroupActionKey(null)
    }
  }

  const deleteGroup = async (groupId: number, groupName: string) => {
    setGroupActionKey(`delete:${groupId}`)
    try {
      const affectedAssistants = assistants.filter((a) => a.group_id === groupId)
      await Promise.all(
        affectedAssistants.map((a) => assistantAPI.update(buildAssistantUpdatePayload(a, { group_id: 0 })))
      )
      await assistantGroupAPI.delete(groupId)
      await Promise.all([loadGroups(), loadAssistants()])
      if (editingGroupId === groupId) cancelRenameGroup()
      toast({ title: `已删除分组「${groupName}」` })
    } catch (err: any) {
      toast({ title: "删除分组失败", description: err.message })
    } finally {
      setGroupActionKey(null)
    }
  }

  const openCreateAssistant = () => {
    editStore.resetAll()
    setAssistantDialogOpen(true)
    loadDialogData()
  }

  const openEditAssistant = async (assistantId: number) => {
    try {
      const a = await assistantAPI.get(assistantId)
      editStore.resetAll()
      editStore.setEditingAssistant(a)
      editStore.setEditName(a.name)
      editStore.setEditAvatarUrl(a.avatar_url || "")
      editStore.setEditDescription(a.description || "")
      editStore.setEditSystemPrompt(a.system_prompt || "")
      editStore.setEditDefaultModelId(a.assistant_model_profile_id || 0)
      editStore.setEditKnowledgeIds((a.knowledge_sources || []).map(k => k.id))
      editStore.setEditMcpIds((a.mcp_servers || []).map(m => m.id))
      editStore.setEditImageGenerationEnabled(a.image_generation_enabled === 1)
      editStore.setEditHistoryRounds(a.history_rounds || 10)
      editStore.setEditWebSearchEngine(a.web_search_engine || '')
      setAssistantDialogOpen(true)
      loadDialogData()
    } catch (err: any) {
      toast({ title: "加载助手失败", description: err.message })
    }
  }

  const loadDialogData = async () => {
    try {
      const [ragResult, mcpResult] = await Promise.all([
        ragAPI.listSources(),
        mcpAPI.list(),
      ])
      const chatModelResult = await providerAPI.listAssistantModelProfiles()
      const chatModels = chatModelResult.list || []
      editStore.setAllRagSources(ragResult.list || [])
      editStore.setAllMcpServers(mcpResult.list || [])
      editStore.setAllChatModels(chatModels)
      if (!editStore.editingAssistant && !editStore.editDefaultModelId && chatModels.length > 0) {
        editStore.setEditDefaultModelId(chatModels[0].id)
      }
      // 搜索引擎列表独立加载，失败不影响其他
      searchProviderAPI.list().then(r => editStore.setAllSearchProviders(r.list || [])).catch(() => {})
    } catch {}
  }

  const handleDuplicateAssistant = async (assistantId: number) => {
    try {
      const a = await assistantAPI.get(assistantId)
      const newAssistant = await assistantAPI.create({
        name: a.name + " (副本)",
        description: a.description,
        system_prompt: a.system_prompt,
        assistant_model_profile_id: a.assistant_model_profile_id || undefined,
        knowledge_sources: (a.knowledge_sources || []).map(k => ({ id: k.id })),
        mcp_servers: (a.mcp_servers || []).map(m => ({ id: m.id })),
        group_id: a.group_id || undefined,
      })
      toast({ title: "助手已复制" })
      loadAssistants()
      selectAssistant(newAssistant.id)
    } catch (err: any) {
      toast({ title: "复制失败", description: err.message })
    }
  }

  const handleClearTopics = async (assistantId: number) => {
    try {
      const result = await topicAPI.list({ assistant_id: assistantId })
      const topicList = result.list || []
      for (const t of topicList) {
        await topicAPI.delete(t.id)
      }
      if (assistantId === currentAssistantId) {
        setTopics([])
        setCurrentTopicId(0)
        setMessages([])
      }
      toast({ title: "话题已清空" })
    } catch (err: any) {
      toast({ title: "清空失败", description: err.message })
    }
  }

  const handleSaveToLibrary = async (assistantId: number) => {
    try {
      await assistantAPI.saveToLibrary(assistantId)
      toast({ title: "已保存到我的助手库" })
      router.push('/marketplace')
    } catch (err: any) {
      toast({ title: "保存失败", description: err.message })
    }
  }

  const renderAssistantItem = (a: typeof assistants[number]) => (
    <div
      key={a.id}
      className={cn(
        "juno-sidebar-item flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors duration-150",
        a.id === currentAssistantId && "is-active"
      )}
      onClick={() => {
        if (dropdownOpenRef.current) return
        selectAssistant(a.id); setSidebarTab('topics')
      }}
    >
      {assistantIconType !== "none" && (() => {
        if (assistantIconType === "model") {
          const iconUrl = getModelIcon(a)
          return (
            <Avatar className={cn(
              "juno-sidebar-avatar h-7 w-7 shrink-0 transition-shadow duration-150",
              a.id === currentAssistantId && "ring-1 ring-foreground/10 dark:ring-white/10"
            )}>
              {iconUrl ? (
                <>
                  <AvatarImage src={iconUrl} />
                  <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/10 to-primary/5 text-primary/70">{a.name.slice(0, 1)}</AvatarFallback>
                </>
              ) : (
                <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/10 to-primary/5 text-primary/70">{a.name.slice(0, 1)}</AvatarFallback>
              )}
            </Avatar>
          )
        }
        return (
          <Avatar className={cn(
            "juno-sidebar-avatar h-7 w-7 shrink-0 transition-shadow duration-150",
            a.id === currentAssistantId && "ring-1 ring-foreground/10 dark:ring-white/10"
          )}>
            {isEmojiAvatar(a.avatar_url) ? (
              <AvatarFallback className="text-base bg-foreground/[0.04] dark:bg-white/[0.06]">{a.avatar_url}</AvatarFallback>
            ) : (
              <>
                <AvatarImage src={a.avatar_url} />
                <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/10 to-primary/5 text-primary/70">{a.name.slice(0, 1)}</AvatarFallback>
              </>
            )}
          </Avatar>
        )
      })()}
      <span className={cn(
        "juno-sidebar-item-title flex-1 text-sm truncate transition-colors duration-150",
        a.id === currentAssistantId ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"
      )}>{a.name}</span>
      <DropdownMenu onOpenChange={(open) => { dropdownOpenRef.current = open; if (!open) setTimeout(() => { dropdownOpenRef.current = false }, 300) }}>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="juno-sidebar-row-action opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all">
            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" className="w-48">
          <DropdownMenuItem onClick={() => openEditAssistant(a.id)}>
            <Edit2 className="h-3.5 w-3.5 mr-2" />编辑助手
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDuplicateAssistant(a.id)}>
            <Copy className="h-3.5 w-3.5 mr-2" />复制助手
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleClearTopics(a.id)}>
            <Eraser className="h-3.5 w-3.5 mr-2" />清空话题
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSaveToLibrary(a.id)}>
            <Save className="h-3.5 w-3.5 mr-2" />保存到助手库
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Smile className="h-3.5 w-3.5 mr-2" />助手图标
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setAssistantIconType("model")}>
                模型图标{assistantIconType === "model" && <Check className="h-3.5 w-3.5 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssistantIconType("emoji")}>
                Emoji 表情{assistantIconType === "emoji" && <Check className="h-3.5 w-3.5 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssistantIconType("none")}>
                不显示{assistantIconType === "none" && <Check className="h-3.5 w-3.5 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Tags className="h-3.5 w-3.5 mr-2" />设置分组
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-[160px]">
              {groups.length > 0 && (
                <>
                  <DropdownMenuItem onClick={() => updateAssistantGroup(a.id, 0)}>
                    无分组 {!a.group_id && <Check className="h-3.5 w-3.5 ml-auto" />}
                  </DropdownMenuItem>
                  {groups.map((g) => (
                    <DropdownMenuItem key={g.id} onClick={() => updateAssistantGroup(a.id, g.id)}>
                      {g.name} {a.group_id === g.id && <Check className="h-3.5 w-3.5 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onSelect={() => { setTimeout(() => { setAddingGroupInline(true); setAddingGroupForAssistantId(a.id) }, 0) }}>
                <PlusIcon className="h-3.5 w-3.5 mr-2" />添加分组
              </DropdownMenuItem>
              {groups.length > 0 && (
                <DropdownMenuItem onSelect={() => { setTimeout(() => setGroupDialogOpen(true), 0) }}>
                  <Edit2 className="h-3.5 w-3.5 mr-2" />分组管理
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowDownAZ className="h-3.5 w-3.5 mr-2" />排序方式
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setAssistantSortOrder(assistantSortOrder === 'pinyin-asc' ? 'default' : 'pinyin-asc')}>
                按拼音升序{assistantSortOrder === 'pinyin-asc' && <Check className="h-3.5 w-3.5 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssistantSortOrder(assistantSortOrder === 'pinyin-desc' ? 'default' : 'pinyin-desc')}>
                按拼音降序{assistantSortOrder === 'pinyin-desc' && <Check className="h-3.5 w-3.5 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <LayoutGrid className="h-3.5 w-3.5 mr-2" />展示方式
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setAssistantListMode('list')}>
                <List className="h-3.5 w-3.5 mr-2" />列表展示{assistantListMode === 'list' && <Check className="h-3.5 w-3.5 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssistantListMode('group')}>
                <LayoutGrid className="h-3.5 w-3.5 mr-2" />分组展示{assistantListMode === 'group' && <Check className="h-3.5 w-3.5 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {a.is_default !== 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeletingAssistantId(a.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />删除
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <>
      <div className="px-2 pt-1 pb-2">
          <button
            onClick={openCreateAssistant}
            className="juno-sidebar-new-topic flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg transition-colors mb-1"
          >
          <div className="juno-sidebar-command-icon flex items-center justify-center h-6 w-6 rounded-lg border border-dashed border-muted-foreground/25">
            <PlusIcon className="h-3.5 w-3.5" />
          </div>
          <span className="truncate">添加助手</span>
        </button>

        {assistantListMode === 'group' ? (
          <>
            {sortedAssistants.filter((a) => !a.group_id).map(renderAssistantItem)}
            {groups.map((group) => {
              const groupAssistants = sortedAssistants.filter((a) => a.group_id === group.id)
              if (groupAssistants.length === 0) return null
              const isCollapsed = collapsedGroups.has(group.id)
              return (
                <div key={group.id} className="mt-1.5">
                  <button
                    type="button"
                    className="juno-sidebar-group-header flex items-center gap-1.5 w-full px-2 py-1.5 group/group"
                    onClick={() => {
                      setCollapsedGroups(prev => {
                        const next = new Set(prev)
                        if (next.has(group.id)) next.delete(group.id)
                        else next.add(group.id)
                        return next
                      })
                    }}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground font-medium truncate">{group.name}</span>
                    <div className="flex-1 h-px bg-border/50 ml-1" />
                  </button>
                  {!isCollapsed && (
                    <div className="pl-2">
                      {groupAssistants.map(renderAssistantItem)}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        ) : (
          sortedAssistants.map(renderAssistantItem)
        )}

        {useChatStore.getState().isLoadingAssistants && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>分组管理</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="flex gap-2">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="输入分组名称"
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGroupName.trim()) submitNewGroup()
                }}
              />
              <Button size="sm" className="h-9 px-3" onClick={submitNewGroup}>
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              {groups.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">暂无分组</p>
              ) : (
                groups.map((group) => {
                  const count = assistants.filter((a) => a.group_id === group.id).length
                  const isEditing = editingGroupId === group.id
                  const isBusy = groupActionKey === `rename:${group.id}` || groupActionKey === `delete:${group.id}`
                  return (
                    <div key={group.id} className="flex items-center gap-2 rounded-lg bg-foreground/[0.04] dark:bg-white/[0.06] px-3 py-2.5">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Input
                            value={editingGroupValue}
                            onChange={(e) => setEditingGroupValue(e.target.value)}
                            className="h-8 flex-1"
                            disabled={isBusy}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameGroup(group.id, group.name, editingGroupValue)
                              if (e.key === 'Escape') cancelRenameGroup()
                            }}
                          />
                          <Button size="sm" variant="outline" className="h-8 px-2 shrink-0" disabled={isBusy} onClick={() => renameGroup(group.id, group.name, editingGroupValue)}>保存</Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 shrink-0" disabled={isBusy} onClick={cancelRenameGroup}>取消</Button>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startRenameGroup(group.id, group.name)}>
                          <p className="text-sm font-medium truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{count} 个助手</p>
                        </div>
                      )}
                      {!isEditing && (
                        <button
                          type="button"
                          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          onClick={() => deleteGroup(group.id, group.name)}
                          disabled={isBusy}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addingGroupInline} onOpenChange={(open) => { if (!open) { setAddingGroupInline(false); setNewGroupName(""); setAddingGroupForAssistantId(null) } }}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>添加分组</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 pt-1">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="分组名称"
              className="h-9"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newGroupName.trim()) submitNewGroup()
              }}
            />
            <Button size="sm" className="h-9 px-3" onClick={submitNewGroup}>创建</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
