"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus, Trash2, ExternalLink, AppWindow, Loader2,
  X, Edit,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { miniappAPI } from "@/lib/api"

interface MiniAppItem {
  id: number
  name: string
  url: string
  icon: string
  description: string
}

export default function MiniAppsPage() {
  const [apps, setApps] = useState<MiniAppItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editApp, setEditApp] = useState<MiniAppItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [fullscreenApp, setFullscreenApp] = useState<MiniAppItem | null>(null)

  const [formName, setFormName] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formIcon, setFormIcon] = useState("")
  const [formDesc, setFormDesc] = useState("")

  const loadApps = async () => {
    setIsLoading(true)
    try {
      const result = await miniappAPI.list()
      setApps(result.list || [])
    } catch (err: any) {
      toast({ title: "加载失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadApps() }, [])

  const openForm = (app?: MiniAppItem) => {
    if (app) {
      setEditApp(app)
      setFormName(app.name)
      setFormUrl(app.url)
      setFormIcon(app.icon)
      setFormDesc(app.description)
    } else {
      setEditApp(null)
      setFormName("")
      setFormUrl("")
      setFormIcon("")
      setFormDesc("")
    }
    setShowAdd(true)
  }

  const handleSave = async () => {
    if (!formName || !formUrl) return
    try {
      if (editApp) {
        await miniappAPI.update({ id: editApp.id, name: formName, url: formUrl, icon: formIcon, description: formDesc })
        toast({ title: "已更新" })
      } else {
        await miniappAPI.create({ name: formName, url: formUrl, icon: formIcon, description: formDesc })
        toast({ title: "已添加" })
      }
      setShowAdd(false)
      loadApps()
    } catch (err: any) {
      toast({ title: "保存失败", description: err.message })
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await miniappAPI.delete(deletingId)
      toast({ title: "已删除" })
      loadApps()
    } catch (err: any) {
      toast({ title: "删除失败", description: err.message })
    } finally {
      setDeletingId(null)
    }
  }

  if (fullscreenApp) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between h-10 px-4 shrink-0 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">{fullscreenApp.icon || "🌐"}</span>
            <span className="font-medium text-sm">{fullscreenApp.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(fullscreenApp.url, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreenApp(null)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <iframe src={fullscreenApp.url} className="flex-1 w-full border-0" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4 max-w-5xl mx-auto">
        <p className="text-xs text-muted-foreground">{apps.length} 个小程序</p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openForm()}>
          <Plus className="h-3.5 w-3.5 mr-1" />添加
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <AppWindow className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm font-medium mb-1">暂无小程序</p>
          <p className="text-xs mb-4">添加常用的 Web 应用，在这里快速访问</p>
          <Button size="sm" onClick={() => openForm()}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />添加小程序
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
          {apps.map(app => (
            <div
              key={app.id}
              className="group relative flex flex-col items-center p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => setFullscreenApp(app)}
            >
              <div className="text-4xl mb-3">{app.icon || "🌐"}</div>
              <p className="text-sm font-medium text-center truncate w-full">{app.name}</p>
              {app.description && (
                <p className="text-[11px] text-muted-foreground text-center line-clamp-2 mt-1">{app.description}</p>
              )}
              <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); openForm(app) }} className="p-1 rounded hover:bg-accent text-muted-foreground">
                  <Edit className="h-3 w-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setDeletingId(app.id) }} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{editApp ? "编辑小程序" : "添加小程序"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs">名称</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="h-9 text-sm" placeholder="例如：ChatGPT" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL</Label>
              <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} className="h-9 text-sm" placeholder="https://chat.openai.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">图标 (emoji)</Label>
              <Input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} className="h-9 text-sm" placeholder="🤖" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">描述 (可选)</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="h-9 text-sm" placeholder="简短描述" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="h-8 text-xs">取消</Button>
            <Button size="sm" onClick={handleSave} disabled={!formName || !formUrl} className="h-8 text-xs">{editApp ? "保存" : "添加"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除小程序？</AlertDialogTitle>
            <AlertDialogDescription>删除后将无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
