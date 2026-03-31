"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export default function McpPage() {
  const router = useRouter()
  const [servers, setServers] = useState<McpServerConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 表单
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
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between px-4 mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">MCP Server 管理</h1>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 mx-auto max-w-4xl">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-5 bg-muted rounded w-1/3" /></CardHeader>
              </Card>
            ))}
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Server className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg mb-2">暂无 MCP Server</p>
            <p className="text-sm mb-4">添加 MCP Server 为助手赋予工具能力</p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              添加 MCP Server
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {servers.map((server) => (
              <Card key={server.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{server.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{server.url}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">{server.transport_type || "sse"}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRefresh(server.id)}
                      disabled={refreshingId === server.id}
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshingId === server.id ? "animate-spin" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(server)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingId(server.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                {server.tools && server.tools.length > 0 && (
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">可用工具 ({server.tools.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {server.tools.map((tool, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">
                          {tool.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 创建/编辑弹窗 */}
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

      {/* 删除确认 */}
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
