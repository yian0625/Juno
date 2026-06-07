"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus, Trash2, Database, Search, FileText,
  Loader2, CheckCircle2, XCircle,
  RefreshCw, Settings, Link, Globe, File as FileIcon,
  UploadCloud, AlertCircle
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ragAPI, providerAPI } from "@/lib/api"
import type { UserRagSource, UserRagItem, RagSearchResult } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const LABELS = {
  tabs: {
    file: "文件",
    url: "网址",
    website: "网站",
  },
  sidebar: {
    empty: "暂无知识库",
    add: "添加",
  },
  main: {
    emptyTitle: "选择一个知识库",
    emptyCreate: "创建你的第一个知识库",
    btnCreate: "新建知识库",
    modelLabel: "嵌入模型",
    searchPlaceholder: "搜索知识库内容...",
    searchBtn: "搜索",
    searchSearching: "搜索中...",
    searchEmpty: "未找到相关内容",
    btnAddFile: "添加文件",
    btnAddUrl: "添加网址",
    btnAddWebsite: "导入 Sitemap",
  },
  fileTab: {
    dropzoneUploading: "上传中...",
    dropzoneIdle: "拖拽文件到这里，或点击上传",
    dropzoneSupport: "支持 TXT, MD, HTML, PDF, DOCX, PPTX, XLSX, CSV 等格式",
    uploadSuccess: "个文件已导入",
    uploadFailed: "上传失败",
    chunkUnit: "段",
  },
  urlTab: {
    empty: "点击右上角「添加网址」导入",
  },
  websiteTab: {
    empty: "点击右上角「导入 Sitemap」批量导入网站内容",
    importing: "导入中...",
    importSuccess: "个链接已开始处理",
  },
  dialogs: {
    createTitle: "新建知识库",
    createNameLabel: "名称",
    createNamePlaceholder: "输入名称",
    createModelLabel: "Embedding 模型",
    createModelPlaceholder: "选择模型",
    createModelDefault: "默认",
    createModelNotSet: "未设置",
    createModelMissing: "请先在管理后台配置 embedding 模型",
    createCancel: "取消",
    createSubmit: "创建",
    createSubmitting: "创建中...",
    createFailed: "创建失败",
    settingsTitle: "知识库设置",
    settingsModelHint: "修改 embedding 模型后会自动重新构建现有索引",
    settingsSave: "保存",
    settingsSaving: "保存中...",
    settingsSaved: "已保存",
    settingsRebuilding: "已保存，正在重建索引",
    settingsFailed: "保存失败",
    urlTitle: "添加网址",
    urlInputPlaceholder: "https://...",
    urlNamePlaceholder: "名称（可选）",
    urlSubmit: "导入",
    urlSubmitting: "导入中...",
    urlFailed: "导入失败",
    sitemapTitle: "导入 Sitemap",
    sitemapInputPlaceholder: "https://example.com/sitemap.xml",
    sitemapSubmit: "导入",
    sitemapSubmitting: "导入中...",
    sitemapFailed: "导入失败",
    deleteSourceTitle: "删除知识库？",
    deleteSourceDesc: "所有文件和向量数据将一并删除且无法恢复。",
    deleteSourceConfirm: "确认删除",
    deleteSourceFailed: "删除失败",
    deleteItemTitle: "删除此项？",
    deleteItemDesc: "相关向量数据将一并清除。",
    deleteItemConfirm: "确认删除",
    deleteItemFailed: "删除失败",
    retryProcessing: "重新处理中",
    retryFailed: "重试失败",
  }
}

const ACCEPTED_FILES = [
  ".txt", ".md", ".markdown", ".csv", ".json", ".xml", ".html", ".htm",
  ".log", ".go", ".py", ".js", ".ts", ".java", ".c", ".cpp", ".rs", ".sh",
  ".yaml", ".yml", ".toml", ".pdf", ".docx", ".xlsx", ".pptx"
]

type Tab = "file" | "url" | "website"


function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i]
}

function formatDate(ts: number): string {
  if (!ts) return ""
  const d = new Date(ts * 1000)
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function StatusDot({ status }: { status: number }) {
  if (status === 2) return <div className="h-2 w-2 rounded-full bg-emerald-500" title="已完成" />
  if (status === 0 || status === 1) return <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="处理中" />
  if (status === 3) return <div className="h-2 w-2 rounded-full bg-rose-500" title="失败" />
  return null
}

export default function KnowledgePage() {
  // --- data ---
  const [sources, setSources] = useState<UserRagSource[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [defaultModel, setDefaultModel] = useState("")
  const [defaultEmbeddingModelId, setDefaultEmbeddingModelId] = useState<number>(0)
  const [embeddingModels, setEmbeddingModels] = useState<Array<{ id: number; model_id: string; display_name: string; group: string }>>([])
  const [items, setItems] = useState<UserRagItem[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("file")

  // --- dialogs ---
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createEmbeddingModelId, setCreateEmbeddingModelId] = useState<number>(0)
  const [isCreating, setIsCreating] = useState(false)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsName, setSettingsName] = useState("")
  const [settingsEmbeddingModelId, setSettingsEmbeddingModelId] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)

  const [urlOpen, setUrlOpen] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [urlName, setUrlName] = useState("")
  const [isSubmittingURL, setIsSubmittingURL] = useState(false)

  const [sitemapOpen, setSitemapOpen] = useState(false)
  const [sitemapInput, setSitemapInput] = useState("")
  const [isSubmittingSitemap, setIsSubmittingSitemap] = useState(false)

  const [deletingSourceId, setDeletingSourceId] = useState<number | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null)

  // --- search ---
  const [searchVisible, setSearchVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<RagSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [isUploading, setIsUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const selected = sources.find(s => s.id === selectedId)
  const selectedEmbeddingModel = embeddingModels.find(m => m.id === selected?.embedding_model_id)
  const defaultEmbeddingModel = embeddingModels.find(m => m.id === defaultEmbeddingModelId)
  const fileItems = items.filter(i => i.item_type === 1)
  const urlItems = items.filter(i => i.item_type === 3)
  const isSelectedSourceProcessing = items.some(i => i.status === 0 || i.status === 1)

  // --- effects ---
  useEffect(() => { loadSources(); loadEmbeddingModels() }, [])
  useEffect(() => { if (selectedId) loadItems() }, [selectedId])
  useEffect(() => {
    if (!items.some(i => i.status === 0 || i.status === 1)) return
    const id = setInterval(loadItems, 2000)
    return () => clearInterval(id)
  }, [items, selectedId])

  // --- loaders ---
  const loadSources = async () => {
    setIsLoading(true)
    try {
      const r = await ragAPI.listSources()
      const list = r.list || []
      setSources(list)
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id)
    } catch (e: any) {
      toast({ title: LABELS.dialogs.createFailed, description: e.message })
    } finally { setIsLoading(false) }
  }
  const loadEmbeddingModels = async () => {
    try {
      const info = await ragAPI.getSourceInfo()
      setDefaultModel(info.embedding_model || "")
      const modelResult = await providerAPI.fetchSystemModelsByType("embedding")
      const models = (modelResult.models || []).map((m) => ({
        id: m.id,
        model_id: m.model_id,
        display_name: m.display_name,
        group: m.group || m.provider_service || "",
      }))
      setEmbeddingModels(models)
      const matchedDefault = models.find((m) =>
        m.id === info.embedding_model_id ||
        m.model_id === info.embedding_model_alias ||
        m.model_id === info.embedding_model
      )
      if (matchedDefault) {
        setDefaultEmbeddingModelId(matchedDefault.id)
      } else if (models.length > 0) {
        setDefaultEmbeddingModelId(models[0].id)
      }
    } catch {}
  }
  const loadItems = async () => {
    if (!selectedId) return
    try { const r = await ragAPI.listItems(selectedId, 0); setItems(r.list || []) } catch {}
  }

  // --- handlers ---
  const handleCreate = async () => {
    if (!createName.trim() || !createEmbeddingModelId) return
    setIsCreating(true)
    try {
      const src = await ragAPI.createSource(createName.trim(), createEmbeddingModelId)
      setCreateOpen(false)
      setCreateName("")
      setCreateEmbeddingModelId(defaultEmbeddingModelId)
      await loadSources(); setSelectedId(src.id)
    } catch (e: any) { toast({ title: LABELS.dialogs.createFailed, description: e.message }) }
    finally { setIsCreating(false) }
  }

  const handleSaveSettings = async () => {
    if (!selected || !settingsName.trim() || !settingsEmbeddingModelId) return
    setIsSaving(true)
    try {
      const embeddingChanged = selected.embedding_model_id !== settingsEmbeddingModelId
      await ragAPI.updateSource(selected.id, {
        name: settingsName.trim(),
        embedding_model_id: settingsEmbeddingModelId,
      })
      setSettingsOpen(false)
      await loadSources()
      await loadItems()
      toast({ title: embeddingChanged ? LABELS.dialogs.settingsRebuilding : LABELS.dialogs.settingsSaved })
    } catch (e: any) { toast({ title: LABELS.dialogs.settingsFailed, description: e.message }) }
    finally { setIsSaving(false) }
  }

  const handleDeleteSource = async () => {
    if (!deletingSourceId) return
    try {
      await ragAPI.deleteSource(deletingSourceId)
      if (selectedId === deletingSourceId) { setSelectedId(null); setItems([]) }
      await loadSources()
    } catch (e: any) { toast({ title: LABELS.dialogs.deleteSourceFailed, description: e.message }) }
    finally { setDeletingSourceId(null) }
  }

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files?.length || !selectedId) return
    setIsUploading(true)
    let ok = 0
    try {
      for (const f of Array.from(files)) {
        try { await ragAPI.ingestFile(selectedId, f); ok++ }
        catch (e: any) { toast({ title: `${f.name} ${LABELS.fileTab.uploadFailed}`, description: e.message }) }
      }
      if (ok > 0) { toast({ title: `${ok} ${LABELS.fileTab.uploadSuccess}` }); loadItems(); loadSources() }
    } finally { setIsUploading(false); if (fileRef.current) fileRef.current.value = "" }
  }, [selectedId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); handleFileUpload(e.dataTransfer.files)
  }, [handleFileUpload])

  const handleSubmitURL = async () => {
    if (!urlInput.trim() || !selectedId) return
    setIsSubmittingURL(true)
    try {
      await ragAPI.ingestURL(selectedId, urlInput.trim(), urlName.trim() || undefined)
      toast({ title: LABELS.dialogs.urlSubmitting }); setUrlInput(""); setUrlName(""); setUrlOpen(false)
      loadItems(); loadSources()
    } catch (e: any) { toast({ title: LABELS.dialogs.urlFailed, description: e.message }) }
    finally { setIsSubmittingURL(false) }
  }

  const handleSubmitSitemap = async () => {
    if (!sitemapInput.trim() || !selectedId) return
    setIsSubmittingSitemap(true)
    try {
      const res = await ragAPI.ingestSitemap(selectedId, sitemapInput.trim())
      toast({ title: `${res.url_count} ${LABELS.websiteTab.importSuccess}` })
      setSitemapInput(""); setSitemapOpen(false)
      loadItems(); loadSources()
    } catch (e: any) { toast({ title: LABELS.dialogs.sitemapFailed, description: e.message }) }
    finally { setIsSubmittingSitemap(false) }
  }

  const handleDeleteItem = async () => {
    if (!deletingItemId) return
    try { await ragAPI.deleteItem(deletingItemId); loadItems(); loadSources() }
    catch (e: any) { toast({ title: LABELS.dialogs.deleteItemFailed, description: e.message }) }
    finally { setDeletingItemId(null) }
  }

  const handleRetry = async (id: number) => {
    try { await ragAPI.retryItem(id); toast({ title: LABELS.dialogs.retryProcessing }); loadItems() }
    catch (e: any) { toast({ title: LABELS.dialogs.retryFailed, description: e.message }) }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedId) return
    setIsSearching(true)
    try {
      const r = await ragAPI.search([selectedId], searchQuery.trim())
      setSearchResults(r.results || [])
      if (!(r.results?.length)) toast({ title: LABELS.main.searchEmpty })
    } catch (e: any) { toast({ title: LABELS.main.searchEmpty, description: e.message }) }
    finally { setIsSearching(false) }
  }

  const openSettings = () => {
    if (!selected) return
    setSettingsName(selected.name)
    setSettingsEmbeddingModelId(selected.embedding_model_id || defaultEmbeddingModelId || embeddingModels[0]?.id || 0)
    setSettingsOpen(true)
  }

  const embModel = selectedEmbeddingModel?.display_name || selected?.embedding_model || defaultEmbeddingModel?.display_name || defaultModel

  const contentTabs: { key: Tab; label: string; icon: typeof FileText; items: UserRagItem[] }[] = [
    { key: "file", label: LABELS.tabs.file, icon: FileText, items: fileItems },
    { key: "url", label: LABELS.tabs.url, icon: Link, items: urlItems },
    { key: "website", label: LABELS.tabs.website, icon: Globe, items: urlItems },
  ]

  const currentTab = contentTabs.find(t => t.key === activeTab)!

  return (
    <div className="h-full flex bg-background">
      {/* ===== Sidebar ===== */}
      <div className="w-[240px] shrink-0 border-r border-border/40 flex flex-col bg-muted/10">
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
            </div>
          ) : sources.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                <Database className="h-5 w-5 opacity-40" />
              </div>
              <span className="text-xs font-medium">{LABELS.sidebar.empty}</span>
            </div>
          ) : (
            sources.map(s => (
              <button
                key={s.id}
                className={cn(
                  "group relative flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer select-none text-left",
                  selectedId === s.id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                onClick={() => { setSelectedId(s.id); setSearchVisible(false); setSearchResults([]) }}
              >
                {selectedId === s.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full" />
                )}
                <Database size={16} className={cn("shrink-0 transition-colors", selectedId === s.id ? "text-primary" : "opacity-60 group-hover:opacity-100")} />
                <span className="truncate flex-1">{s.name}</span>
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t border-border/40 bg-background/50">
          <button
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer select-none border border-dashed border-border/60 hover:border-border"
            onClick={() => { setCreateName(""); setCreateEmbeddingModelId(defaultEmbeddingModelId || embeddingModels[0]?.id || 0); setCreateOpen(true) }}
          >
            <Plus size={16} />
            {LABELS.sidebar.add}
          </button>
        </div>
      </div>

      {/* ===== Right content ===== */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Database className="h-8 w-8 opacity-20" />
            </div>
            <p className="text-sm font-medium">{sources.length === 0 ? LABELS.main.emptyCreate : LABELS.main.emptyTitle}</p>
            {sources.length === 0 && (
              <Button
                variant="default"
                className="mt-2 rounded-full px-6 shadow-sm"
                onClick={() => { setCreateName(""); setCreateEmbeddingModelId(defaultEmbeddingModelId || embeddingModels[0]?.id || 0); setCreateOpen(true) }}
              >
                <Plus size={16} className="mr-2" />
                {LABELS.main.btnCreate}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* -- Info bar -- */}
            <div className="flex items-center gap-4 px-6 h-14 shrink-0 border-b border-border/40">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold tracking-tight">{selected.name}</h2>
                {isSelectedSourceProcessing && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700">
                    重建中
                  </span>
                )}
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                  onClick={openSettings}
                  title={LABELS.main.modelLabel}
                >
                  <Settings size={12} />
                  <span className="text-[11px] font-mono">{embModel || "未设置"}</span>
                </button>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button
                  className={cn(
                    "p-2 rounded-full transition-all",
                    searchVisible ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => { setSearchVisible(!searchVisible); setSearchResults([]) }}
                >
                  <Search size={16} />
                </button>
              </div>
            </div>

            {/* -- Search (collapsible) -- */}
            <div className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out border-b border-border/40 bg-muted/10",
              searchVisible ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 border-transparent"
            )}>
              <div className="p-6">
                <div className="flex gap-3 max-w-2xl mx-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSearch()}
                      placeholder={LABELS.main.searchPlaceholder}
                      className="pl-9 h-10 rounded-full bg-background border-border/60 shadow-sm focus-visible:ring-primary/20"
                      autoFocus
                    />
                  </div>
                  <Button className="h-10 rounded-full px-6 shadow-sm" onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : LABELS.main.searchBtn}
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-6 flex flex-col gap-3 max-w-2xl mx-auto">
                    {searchResults.map((r, i) => (
                      <div key={i} className="rounded-xl border border-border/50 bg-background p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-[10px] text-primary font-medium">
                            {i + 1}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded-md">
                            {(r.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90">{r.chunk_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* -- Tab bar -- */}
            <div className="flex items-center gap-6 px-6 h-12 shrink-0 border-b border-border/40">
              {contentTabs.map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    className={cn(
                      "relative flex items-center gap-2 h-full text-sm font-medium select-none transition-colors",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
                    )}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <Icon size={16} className={cn(active ? "text-primary" : "opacity-70")} />
                    {tab.label}
                    <span className={cn(
                      "text-[11px] tabular-nums px-1.5 py-0.5 rounded-full",
                      active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {tab.items.length}
                    </span>
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-primary" />
                    )}
                  </button>
                )
              })}
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-xs gap-1.5 shadow-sm"
                onClick={() => {
                  if (activeTab === "file") fileRef.current?.click()
                  else if (activeTab === "url") { setUrlInput(""); setUrlName(""); setUrlOpen(true) }
                  else { setSitemapInput(""); setSitemapOpen(true) }
                }}
                disabled={isUploading}
              >
                <Plus size={14} />
                {activeTab === "file" ? LABELS.main.btnAddFile : activeTab === "url" ? LABELS.main.btnAddUrl : LABELS.main.btnAddWebsite}
              </Button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileRef} type="file" multiple className="hidden"
              accept={ACCEPTED_FILES.join(",")}
              onChange={e => handleFileUpload(e.target.files)}
            />

            {/* -- Content area -- */}
            <div className="flex-1 overflow-y-auto bg-muted/5 p-6">
              <div className="max-w-4xl mx-auto flex flex-col gap-4">
                {activeTab === "file" && (
                  <>
                    {/* Drop zone */}
                    <div
                      className={cn(
                        "rounded-xl border-2 border-dashed py-10 flex flex-col items-center gap-3 cursor-pointer transition-all bg-background",
                        "hover:border-primary/50 hover:bg-primary/5",
                        isUploading ? "opacity-50 pointer-events-none border-border" : "border-border/60"
                      )}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleDrop}
                    >
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                        <UploadCloud size={24} />
                      </div>
                      <span className="text-sm font-medium text-foreground">{isUploading ? LABELS.fileTab.dropzoneUploading : LABELS.fileTab.dropzoneIdle}</span>
                      <span className="text-xs text-muted-foreground">{LABELS.fileTab.dropzoneSupport}</span>
                    </div>

                    {/* File list */}
                    <div className="flex flex-col gap-2 mt-2">
                      {fileItems.map(item => (
                        <div key={item.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl bg-background border border-border/40 shadow-sm hover:shadow-md hover:border-border/80 transition-all">
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/5 flex items-center justify-center text-primary/70">
                            <FileIcon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-foreground/90">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{formatDate(item.create_time)}</span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span>{formatFileSize(item.file_size)}</span>
                              {item.status === 2 && item.chunk_count > 0 && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-border" />
                                  <span>{item.chunk_count} {LABELS.fileTab.chunkUnit}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.status === 3 && (
                              <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" onClick={() => handleRetry(item.id)} title="重试">
                                <RefreshCw size={14} />
                              </button>
                            )}
                            <StatusDot status={item.status} />
                            <button
                              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                              onClick={() => setDeletingItemId(item.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === "url" && (
                  <>
                    {urlItems.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {urlItems.map(item => (
                          <div key={item.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl bg-background border border-border/40 shadow-sm hover:shadow-md hover:border-border/80 transition-all">
                            <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-500/5 flex items-center justify-center text-blue-500/70">
                              <Link size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-foreground/90">{item.name}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{formatDate(item.create_time)}</span>
                                {item.status === 2 && item.chunk_count > 0 && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span>{item.chunk_count} {LABELS.fileTab.chunkUnit}</span>
                                  </>
                                )}
                                {item.status === 3 && item.error_msg && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span className="text-destructive/80 truncate max-w-[200px]">{item.error_msg}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {item.status === 3 && (
                                <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" onClick={() => handleRetry(item.id)} title="重试">
                                  <RefreshCw size={14} />
                                </button>
                              )}
                              <StatusDot status={item.status} />
                              <button
                                className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                                onClick={() => setDeletingItemId(item.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center">
                          <Link className="h-8 w-8 opacity-20" />
                        </div>
                        <span className="text-sm font-medium">{LABELS.urlTab.empty}</span>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "website" && (
                  <>
                    <div
                      className={cn(
                        "rounded-xl border-2 border-dashed py-10 flex flex-col items-center gap-3 cursor-pointer transition-all bg-background",
                        "hover:border-primary/50 hover:bg-primary/5 border-border/60"
                      )}
                      onClick={() => { setSitemapInput(""); setSitemapOpen(true) }}
                    >
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                        <Globe size={24} />
                      </div>
                      <span className="text-sm font-medium text-foreground">{LABELS.websiteTab.empty}</span>
                    </div>

                    {urlItems.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        {urlItems.map(item => (
                          <div key={item.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl bg-background border border-border/40 shadow-sm hover:shadow-md hover:border-border/80 transition-all">
                            <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-500/5 flex items-center justify-center text-blue-500/70">
                              <Link size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-foreground/90">{item.name}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{formatDate(item.create_time)}</span>
                                {item.status === 2 && item.chunk_count > 0 && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span>{item.chunk_count} {LABELS.fileTab.chunkUnit}</span>
                                  </>
                                )}
                                {item.status === 3 && item.error_msg && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span className="text-destructive/80 truncate max-w-[200px]">{item.error_msg}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {item.status === 3 && (
                                <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" onClick={() => handleRetry(item.id)} title="重试">
                                  <RefreshCw size={14} />
                                </button>
                              )}
                              <StatusDot status={item.status} />
                              <button
                                className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                                onClick={() => setDeletingItemId(item.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== Dialogs ===== */}

      {/* 新建知识库 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader><DialogTitle>{LABELS.dialogs.createTitle}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-5 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{LABELS.dialogs.createNameLabel}</label>
              <Input value={createName} onChange={e => setCreateName(e.target.value)} placeholder={LABELS.dialogs.createNamePlaceholder} autoFocus className="rounded-lg" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{LABELS.dialogs.createModelLabel}</label>
              <Select value={createEmbeddingModelId > 0 ? String(createEmbeddingModelId) : undefined} onValueChange={v => setCreateEmbeddingModelId(parseInt(v, 10))}>
                <SelectTrigger className="text-sm rounded-lg">
                  <SelectValue placeholder={LABELS.dialogs.createModelPlaceholder} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {embeddingModels.map(embeddingModel => (
                    <SelectItem key={embeddingModel.id} value={String(embeddingModel.id)}>{embeddingModel.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {embeddingModels.length === 0 && (
                <div className="text-[11px] text-muted-foreground">
                  {LABELS.dialogs.createModelMissing}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full">{LABELS.dialogs.createCancel}</Button>
            <Button onClick={handleCreate} disabled={isCreating || !createName.trim() || !createEmbeddingModelId} className="rounded-full">
              {isCreating ? LABELS.dialogs.createSubmitting : LABELS.dialogs.createSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 知识库设置 */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader><DialogTitle>{LABELS.dialogs.settingsTitle}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-5 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{LABELS.dialogs.createNameLabel}</label>
              <Input value={settingsName} onChange={e => setSettingsName(e.target.value)} autoFocus className="rounded-lg" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{LABELS.dialogs.createModelLabel}</label>
              <Select value={settingsEmbeddingModelId > 0 ? String(settingsEmbeddingModelId) : undefined} onValueChange={v => setSettingsEmbeddingModelId(parseInt(v, 10))}>
                <SelectTrigger className="text-sm rounded-lg">
                  <SelectValue placeholder={LABELS.dialogs.createModelPlaceholder} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {embeddingModels.map(embeddingModel => (
                    <SelectItem key={embeddingModel.id} value={String(embeddingModel.id)}>{embeddingModel.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {embeddingModels.length === 0 && (
                <div className="text-[11px] text-muted-foreground">
                  {LABELS.dialogs.createModelMissing}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1 bg-muted/50 p-2 rounded-md">
                <AlertCircle size={12} />
                <span>{LABELS.dialogs.settingsModelHint}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)} className="rounded-full">{LABELS.dialogs.createCancel}</Button>
            <Button onClick={handleSaveSettings} disabled={isSaving || !settingsName.trim() || !settingsEmbeddingModelId} className="rounded-full">
              {isSaving ? LABELS.dialogs.settingsSaving : LABELS.dialogs.settingsSave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加网址 */}
      <Dialog open={urlOpen} onOpenChange={setUrlOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader><DialogTitle>{LABELS.dialogs.urlTitle}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder={LABELS.dialogs.urlInputPlaceholder} className="font-mono text-sm rounded-lg" autoFocus />
            <Input value={urlName} onChange={e => setUrlName(e.target.value)} placeholder={LABELS.dialogs.urlNamePlaceholder} onKeyDown={e => e.key === "Enter" && handleSubmitURL()} className="rounded-lg" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUrlOpen(false)} className="rounded-full">{LABELS.dialogs.createCancel}</Button>
            <Button onClick={handleSubmitURL} disabled={isSubmittingURL || !urlInput.trim()} className="rounded-full">
              {isSubmittingURL ? LABELS.dialogs.urlSubmitting : LABELS.dialogs.urlSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入 Sitemap */}
      <Dialog open={sitemapOpen} onOpenChange={setSitemapOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader><DialogTitle>{LABELS.dialogs.sitemapTitle}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input value={sitemapInput} onChange={e => setSitemapInput(e.target.value)} placeholder={LABELS.dialogs.sitemapInputPlaceholder} className="font-mono text-sm rounded-lg" autoFocus onKeyDown={e => e.key === "Enter" && handleSubmitSitemap()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSitemapOpen(false)} className="rounded-full">{LABELS.dialogs.createCancel}</Button>
            <Button onClick={handleSubmitSitemap} disabled={isSubmittingSitemap || !sitemapInput.trim()} className="rounded-full">
              {isSubmittingSitemap ? LABELS.dialogs.sitemapSubmitting : LABELS.dialogs.sitemapSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除知识库确认 */}
      <AlertDialog open={!!deletingSourceId} onOpenChange={o => !o && setDeletingSourceId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{LABELS.dialogs.deleteSourceTitle}</AlertDialogTitle>
            <AlertDialogDescription>{LABELS.dialogs.deleteSourceDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{LABELS.dialogs.createCancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSource} className="rounded-full bg-destructive hover:bg-destructive/90">{LABELS.dialogs.deleteSourceConfirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除条目确认 */}
      <AlertDialog open={!!deletingItemId} onOpenChange={o => !o && setDeletingItemId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{LABELS.dialogs.deleteItemTitle}</AlertDialogTitle>
            <AlertDialogDescription>{LABELS.dialogs.deleteItemDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{LABELS.dialogs.createCancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="rounded-full bg-destructive hover:bg-destructive/90">{LABELS.dialogs.deleteItemConfirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
