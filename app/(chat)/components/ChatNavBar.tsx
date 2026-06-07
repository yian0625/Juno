"use client"

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  MessageCircle,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react"
import { useChatStore, useUIStore } from "@/lib/stores"
import { isEmojiAvatar } from "@/lib/helpers"
import type { Model } from "@/lib/types"
import type { AgentWorkspace } from "@/lib/stores"

interface FolderResult {
  canceled?: boolean
  path?: string
  name?: string
  error?: string
}

function getModelDisplayName(model?: Model) {
  return model?.name || model?.model_name || model?.alias || ""
}

function getFolderStorageKey(topicId: number, assistantId: number) {
  if (topicId) return `juno-topic-folder:${topicId}`
  if (assistantId) return `juno-assistant-draft-folder:${assistantId}`
  return "juno-topic-folder:draft"
}

export default function ChatNavBar() {
  const assistants = useChatStore((s) => s.assistants)
  const currentAssistantId = useChatStore((s) => s.currentAssistantId)
  const currentTopicId = useChatStore((s) => s.currentTopicId)
  const currentModel = useChatStore((s) => s.currentModel)
  const changeCurrentModel = useChatStore((s) => s.changeCurrentModel)
  const chatModels = useChatStore((s) => s.chatModels)
  const selectedWorkspace = useChatStore((s) => s.selectedWorkspace)
  const setSelectedWorkspace = useChatStore((s) => s.setSelectedWorkspace)
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [createFolderError, setCreateFolderError] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)

  const currentAssistant = assistants.find((a) => a.id === currentAssistantId)
  const visibleModels = chatModels
  const selectedModel = visibleModels.find((model) => model.alias === currentModel)
  const folderStorageKey = getFolderStorageKey(currentTopicId, currentAssistantId)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(folderStorageKey)
      if (!raw) {
        setSelectedWorkspace(null)
        return
      }
      const folder = JSON.parse(raw)
      setSelectedWorkspace(folder?.path && folder?.name ? folder : null)
    } catch {
      setSelectedWorkspace(null)
    }
  }, [folderStorageKey, setSelectedWorkspace])

  const groupedModels = useMemo(() => {
    const groups = new Map<string, Model[]>()
    visibleModels
      .filter((model) => model.alias)
      .forEach((model) => {
        const key = model.provider || "Juno Hub"
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(model)
      })
    return Array.from(groups.entries())
  }, [visibleModels])

  const saveSelectedFolder = (folder: AgentWorkspace) => {
    setSelectedWorkspace(folder)
    localStorage.setItem(folderStorageKey, JSON.stringify(folder))
  }

  const saveFolderResult = (result: FolderResult | undefined) => {
    if (!result?.path || result.canceled) return
    saveSelectedFolder({
      path: result.path,
      name: result.name || result.path.split(/[\\/]/).filter(Boolean).pop() || result.path,
    })
  }

  const openCreateFolderDialog = () => {
    setNewFolderName("")
    setCreateFolderError("")
    setCreateDialogOpen(true)
  }

  const handleCreateBlankFolder = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const folderName = newFolderName.trim()
    if (!folderName) {
      setCreateFolderError("请输入文件夹名称")
      return
    }
    if (/[\\/:]/.test(folderName) || folderName === "." || folderName === "..") {
      setCreateFolderError("名称不能包含 /、\\、:，也不能是 . 或 ..")
      return
    }

    const createFolder = window.junoDesktop?.createFolder
    if (!createFolder) {
      setCreateFolderError("当前环境不支持直接创建文件夹")
      return
    }
    try {
      setCreatingFolder(true)
      setCreateFolderError("")
      const result = await createFolder(folderName)
      if (result?.error) {
        setCreateFolderError(result.error)
        return
      }
      saveFolderResult(result)
      if (result?.path && !result.canceled) {
        setCreateDialogOpen(false)
        setNewFolderName("")
      }
    } catch {
      setCreateFolderError("创建失败")
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleOpenExistingFolder = async () => {
    const chooseFolder = window.junoDesktop?.chooseFolder
    if (!chooseFolder) {
      folderInputRef.current?.click()
      return
    }
    try {
      const result = await chooseFolder()
      saveFolderResult(result)
    } catch {}
  }

  const clearSelectedFolder = () => {
    setSelectedWorkspace(null)
    localStorage.removeItem(folderStorageKey)
  }

  const handleFolderInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const firstFile = event.target.files?.[0] as File | undefined
    const relativePath = (firstFile as any)?.webkitRelativePath || ''
    const rootName = relativePath.split('/').filter(Boolean)[0]
    if (rootName) {
      saveSelectedFolder({ path: rootName, name: rootName })
    }
    event.target.value = ''
  }

  return (
    <>
      <div className="juno-chat-navbar flex items-center px-3 h-12 shrink-0 border-b border-border/40">
        <Button variant="ghost" size="icon" className="juno-no-drag juno-toolbar-icon h-8 w-8 shrink-0 rounded-md" onClick={toggleSidebar}>
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
        <div className="flex items-center gap-2 min-w-0 flex-1 ml-2">
          {currentAssistant && (
            <div className="juno-chat-title-pill flex items-center gap-2 min-w-0 text-sm">
              <Avatar className="h-7 w-7 shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                {isEmojiAvatar(currentAssistant.avatar_url) ? (
                  <AvatarFallback className="text-sm bg-transparent">{currentAssistant.avatar_url}</AvatarFallback>
                ) : (
                  <>
                    <AvatarImage src={currentAssistant.avatar_url} />
                    <AvatarFallback className="text-xs">{currentAssistant.name.slice(0, 1)}</AvatarFallback>
                  </>
                )}
              </Avatar>
              <span className="font-medium truncate">{currentAssistant.name}</span>
              {visibleModels.length > 0 && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Select value={currentModel} onValueChange={(value) => { void changeCurrentModel(value) }}>
                    <SelectTrigger className="juno-no-drag h-7 border-none shadow-none bg-transparent px-1 text-sm text-muted-foreground hover:text-foreground gap-1 max-w-[220px]">
                      <SelectValue placeholder={getModelDisplayName(selectedModel) || currentModel || "选择模型"} />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedModels.map(([groupName, models]) => (
                        <div key={groupName}>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            {groupName}
                          </div>
                          {models.map((model) => (
                            <SelectItem key={`${model.provider}-${model.id}-${model.alias}`} value={model.alias}>
                              {getModelDisplayName(model)}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="juno-chat-folder-picker juno-no-drag flex items-center gap-1.5 shrink-0"
                        aria-label={selectedWorkspace ? `当前工作区：${selectedWorkspace.name}` : '打开工作区菜单'}
                      >
                        {selectedWorkspace ? (
                          <>
                            <Folder className="h-4 w-4 opacity-75" />
                            <span className="truncate">{selectedWorkspace.name}</span>
                          </>
                        ) : (
                          <FolderPlus className="h-4 w-4 opacity-75" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" sideOffset={8} className="juno-folder-context-menu w-56 p-1.5">
                      <DropdownMenuItem
                        className={`juno-folder-context-item ${!selectedWorkspace ? "is-active" : ""}`}
                        onSelect={clearSelectedFolder}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>不使用文件夹</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="juno-folder-context-item"
                        onSelect={openCreateFolderDialog}
                      >
                        <FolderPlus className="h-4 w-4" />
                        <span>从空白开始</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="juno-folder-context-item"
                        onSelect={() => {
                          void handleOpenExistingFolder()
                        }}
                      >
                        <FolderOpen className="h-4 w-4" />
                        <span>打开已有文件夹</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <input
                    ref={folderInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFolderInputChange}
                    {...({ webkitdirectory: '', directory: '' } as any)}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="juno-create-folder-dialog sm:max-w-[340px] p-0 gap-0 overflow-hidden">
          <form onSubmit={handleCreateBlankFolder} className="space-y-4">
            <DialogHeader className="gap-1.5 px-5 pt-5">
              <DialogTitle className="text-[15px]">新建工作区文件夹</DialogTitle>
              <DialogDescription className="text-xs">位置：文稿 / Juno</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 px-5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="juno-new-folder-name">
                名称
              </label>
              <Input
                id="juno-new-folder-name"
                autoFocus
                className="juno-create-folder-input"
                value={newFolderName}
                onChange={(event) => {
                  setNewFolderName(event.target.value)
                  if (createFolderError) setCreateFolderError("")
                }}
                placeholder="例如 my-project"
              />
              {createFolderError && (
                <p className="text-xs text-destructive">{createFolderError}</p>
              )}
            </div>
            <DialogFooter className="border-t border-border/60 bg-muted/35 px-5 py-3">
              <Button
                type="button"
                variant="ghost"
                className="h-8"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creatingFolder}
              >
                取消
              </Button>
              <Button type="submit" className="h-8" disabled={creatingFolder}>
                {creatingFolder ? "创建中" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
