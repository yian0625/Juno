"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, RefreshCw, Server, Edit2 } from "lucide-react"
import { mcpAPI } from "@/lib/api"
import type { McpServerConfig } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function McpPage() {
  const router = useRouter()
  const [servers, setServers] = useState<McpServerConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formName, setFormName] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formTransport, setFormTransport] = useState("sse")

  useEffect(() => { loadServers() }, [])

  const loadServers = async () => {
    setIsLoading(true)
    try {
      const result = await mcpAPI.list()
      setServers(result.list || [])
    } catch (err: any) {
      toast({ title: "加载失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  const openCreate = () => {
    setEditingServer(null)
    setFormName("")
    setFormUrl("")
    setFormTransport("sse")
    setDialogOpen(true)
  }

  const openEdit = (server: McpServerConfig) => {
    setEditingServer(server)
    setFormName(server.name)
    setFormUrl(server.url)
    setFormTransport(server.transport_type || "sse")
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim() || !formUrl.trim()) {
      toast({ title: "请填写名称和 URL" })
      return
    }

    setIsSubmitting(true)
    try {
      if (editingServer) {
        await mcpAPI.update({
          id: editingServer.id,
          name: formName.trim(),
          url: formUrl.trim(),
          transport_type: formTransport,
        })
        toast({ title: "更新成功" })
      } else {
        await mcpAPI.create({
          name: formName.trim(),
          url: formUrl.trim(),
          transport_type: formTransport,
        })
        toast({ title: "创建成功" })
      }
      setDialogOpen(false)
      loadServers()
    } catch (err: any) {
      toast({ title: "操作失败", description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await mcpAPI.delete(deletingId)
      toast({ title: "已删除" })
      loadServers()
    } catch (err: any) {
      toast({ title: "删除失败", description: err.message })
    } finally {
      setDeletingId(null)
    }
  }

  const handleRefresh = async (id: number) => {
    setRefreshingId(id)
    try {
      const updated = await mcpAPI.refresh(id)
      setServers((prev) => prev.map((s) => (s.id === id ? updated : s)))
      toast({ title: "刷新成功", description: `发现 ${updated.tools?.length || 0} 个工具` })
    } catch (err: any) {
      toast({ title: "刷新失败", description: err.message })
    } finally {
      setRefreshingId(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">{servers.length} 个 Server</p>
            <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" />添加
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-lg border border-border/50 p-4">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : servers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Server className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1">暂无 MCP Server</p>
              <p className="text-xs mb-4">添加 MCP Server 为助手赋予工具能力</p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                添加 MCP Server
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {servers.map((server) => (
                <div key={server.id} className="rounded-lg border border-border/50 p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{server.name}</span>
                      <Badge variant="outline" className="text-[10px] h-5">{server.transport_type || "sse"}</Badge>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRefresh(server.id)}
                        disabled={refreshingId === server.id}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", refreshingId === server.id && "animate-spin")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(server)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingId(server.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{server.url}</p>
                  {server.tools && server.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {server.tools.map((tool, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-normal h-5">
                          {tool.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingServer ? "编辑 MCP Server" : "添加 MCP Server"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="例如：天气查询" />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://mcp.example.com/..." className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>传输协议</Label>
              <Select value={formTransport} onValueChange={setFormTransport}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sse">SSE</SelectItem>
                  <SelectItem value="stdio">Stdio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 MCP Server？</AlertDialogTitle>
            <AlertDialogDescription>删除后绑定此 Server 的助手将无法使用对应工具。</AlertDialogDescription>
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
