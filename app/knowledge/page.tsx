"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Plus, Trash2, Database, Upload, Search } from "lucide-react"
import { ragAPI } from "@/lib/api"
import type { UserRagSource, RagSearchResult } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

export default function KnowledgePage() {
  const router = useRouter()
  const [sources, setSources] = useState<UserRagSource[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 创建知识源
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // 导入文本
  const [ingestOpen, setIngestOpen] = useState(false)
  const [ingestSourceId, setIngestSourceId] = useState<number>(0)
  const [ingestText, setIngestText] = useState("")
  const [isIngesting, setIsIngesting] = useState(false)

  // 搜索测试
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchSourceIds, setSearchSourceIds] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<RagSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // 删除
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => { loadSources() }, [])

  const loadSources = async () => {
    setIsLoading(true)
    try {
      const result = await ragAPI.listSources()
      setSources(result.list || [])
    } catch (err: any) {
      toast({ title: "加载失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast({ title: "请输入知识源名称" })
      return
    }
    setIsCreating(true)
    try {
      await ragAPI.createSource(createName.trim())
      toast({ title: "创建成功" })
      setCreateOpen(false)
      setCreateName("")
      loadSources()
    } catch (err: any) {
      toast({ title: "创建失败", description: err.message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await ragAPI.deleteSource(deletingId)
      toast({ title: "已删除" })
      loadSources()
    } catch (err: any) {
      toast({ title: "删除失败", description: err.message })
    } finally {
      setDeletingId(null)
    }
  }

  const handleIngest = async () => {
    if (!ingestText.trim()) {
      toast({ title: "请输入文本内容" })
      return
    }
    setIsIngesting(true)
    try {
      await ragAPI.ingest(ingestSourceId, ingestText.trim())
      toast({ title: "导入成功", description: "文本已自动分块并生成向量" })
      setIngestOpen(false)
      setIngestText("")
    } catch (err: any) {
      toast({ title: "导入失败", description: err.message })
    } finally {
      setIsIngesting(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchSourceIds.length === 0) {
      toast({ title: "请选择知识源并输入搜索内容" })
      return
    }
    setIsSearching(true)
    try {
      const result = await ragAPI.search(searchSourceIds, searchQuery.trim())
      setSearchResults(result.results || [])
      if ((result.results || []).length === 0) {
        toast({ title: "未找到相关内容" })
      }
    } catch (err: any) {
      toast({ title: "搜索失败", description: err.message })
    } finally {
      setIsSearching(false)
    }
  }

  const openIngest = (sourceId: number) => {
    setIngestSourceId(sourceId)
    setIngestText("")
    setIngestOpen(true)
  }

  const openSearch = () => {
    setSearchSourceIds(sources.map((s) => s.id))
    setSearchQuery("")
    setSearchResults([])
    setSearchOpen(true)
  }

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between px-4 mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">知识库管理</h1>
          </div>
          <div className="flex gap-2">
            {sources.length > 0 && (
              <Button variant="outline" size="sm" onClick={openSearch}>
                <Search className="h-4 w-4 mr-1" />
                搜索测试
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              创建知识源
            </Button>
          </div>
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
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Database className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg mb-2">暂无知识源</p>
            <p className="text-sm mb-4">创建知识源并导入文本，为助手提供专属知识</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              创建知识源
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sources.map((source) => (
              <Card key={source.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{source.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      创建于 {new Date(source.create_time * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => openIngest(source.id)}>
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      导入文本
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingId(source.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 创建知识源弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>创建知识源</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>知识源名称</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="例如：产品文档"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入文本弹窗 */}
      <Dialog open={ingestOpen} onOpenChange={setIngestOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>导入文本</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              粘贴或输入文本内容，系统将自动分块并生成向量索引。
            </p>
            <Textarea
              value={ingestText}
              onChange={(e) => setIngestText(e.target.value)}
              placeholder="在此粘贴文本内容..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIngestOpen(false)}>取消</Button>
            <Button onClick={handleIngest} disabled={isIngesting}>
              {isIngesting ? "导入中..." : "导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 搜索测试弹窗 */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>搜索测试</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>选择知识源</Label>
              <div className="flex flex-wrap gap-2">
                {sources.map((source) => (
                  <Badge
                    key={source.id}
                    variant={searchSourceIds.includes(source.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      setSearchSourceIds((prev) =>
                        prev.includes(source.id)
                          ? prev.filter((id) => id !== source.id)
                          : [...prev, source.id]
                      )
                    }
                  >
                    {source.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入搜索内容"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? "搜索中..." : "搜索"}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {searchResults.map((result, i) => (
                  <Card key={result.id || i}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          相关度: {(result.score * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{result.chunk_text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除知识源？</AlertDialogTitle>
            <AlertDialogDescription>删除后所有数据将无法恢复。</AlertDialogDescription>
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
