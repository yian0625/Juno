"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Download, Bot, SendHorizonal, Clock, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { assistantAPI } from "@/lib/api"
import { useChatStore } from "@/lib/stores"
import type { Assistant } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

const REVIEW_STATUS: Record<number, { label: string; icon: React.ReactNode; className: string }> = {
  0: { label: "审核中", icon: <Clock className="h-3.5 w-3.5" />, className: "text-amber-500" },
  1: { label: "已通过", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-green-500" },
  2: { label: "已拒绝", icon: <XCircle className="h-3.5 w-3.5" />, className: "text-destructive" },
}
const getReviewStatus = (s: number) => REVIEW_STATUS[s] ?? REVIEW_STATUS[0]

function AssistantCard({ a, action }: { a: Assistant; action?: React.ReactNode }) {
  return (
    <div className="glass-card p-4 flex flex-col group">
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={a.avatar_url} />
          <AvatarFallback className="text-xs font-medium bg-muted">{a.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="text-sm font-medium truncate">{a.name}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{a.description || "暂无描述"}</p>
        </div>
      </div>
      <div className="flex-1 mb-3">
        <div className="text-xs text-muted-foreground line-clamp-3 leading-relaxed bg-muted/30 p-2.5 rounded-md">
          {a.system_prompt || "暂无系统提示词"}
        </div>
      </div>
      {action}
    </div>
  )
}

export default function MarketplacePage() {
  const [myList, setMyList] = useState<Assistant[]>([])
  const [publicList, setPublicList] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [cloningId, setCloningId] = useState<number | null>(null)
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const limit = 20

  const loadAssistants = useChatStore((s) => s.loadAssistants)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [myRes, pubRes] = await Promise.all([
        assistantAPI.myLibrary(),
        assistantAPI.marketplaceList(0, limit),
      ])
      setMyList(myRes.list || [])
      setPublicList(pubRes.list || [])
      setHasMore((pubRes.list || []).length === limit)
      setPage(1)
    } catch (err: any) {
      toast({ title: "加载失败", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const loadMorePublic = async () => {
    setLoadingMore(true)
    try {
      const result = await assistantAPI.marketplaceList(page * limit, limit)
      const list = result.list || []
      setPublicList(prev => [...prev, ...list])
      setHasMore(list.length === limit)
      setPage(p => p + 1)
    } catch (err: any) {
      toast({ title: "加载失败", description: err.message, variant: "destructive" })
    } finally {
      setLoadingMore(false)
    }
  }

  const handleClone = async (a: Assistant) => {
    if (cloningId) return
    setCloningId(a.id)
    try {
      await assistantAPI.clone(a.id)
      await loadAssistants()
      toast({ title: "克隆成功", description: `已将「${a.name}」添加到我的助手` })
    } catch (err: any) {
      toast({ title: "克隆失败", description: err.message, variant: "destructive" })
    } finally {
      setCloningId(null)
    }
  }

  const handleSubmitReview = async (id: number) => {
    if (submittingId) return
    setSubmittingId(id)
    try {
      await assistantAPI.submitReview(id)
      toast({ title: "已提交审核，等待管理员审核" })
      fetchAll()
    } catch (err: any) {
      toast({ title: "提交失败", description: err.message, variant: "destructive" })
    } finally {
      setSubmittingId(null)
    }
  }

  const filteredPublic = publicList.filter(a =>
    !searchQuery ||
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card p-4 h-[200px] flex flex-col animate-pulse">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
              <div className="space-y-2 mb-auto">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
              <div className="h-8 bg-muted rounded w-full mt-3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* 我的库 */}
        {myList.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3">我的库</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {myList.map((a) => {
                const isLibrary = a.assistant_type === 3
                const status = getReviewStatus(a.review_status)
                return (
                  <AssistantCard
                    key={a.id}
                    a={a}
                    action={
                      isLibrary ? (
                        <div className="flex items-center gap-2">
                          {a.review_status === 2 && (
                            <span className={cn("flex items-center gap-1 text-xs", getReviewStatus(2).className)}>
                              {getReviewStatus(2).icon}{getReviewStatus(2).label}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSubmitReview(a.id)}
                            disabled={submittingId === a.id}
                            className="flex-1 h-8 text-xs glass-btn border-0"
                          >
                            {submittingId === a.id ? (
                              <div className="flex items-center gap-1.5">
                                <div className="animate-spin h-3 w-3 border-2 border-muted-foreground/30 border-t-foreground rounded-full" />
                                提交中...
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <SendHorizonal className="h-3.5 w-3.5" />
                                {a.review_status === 2 ? "重新提交" : "提交审核"}
                              </div>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className={cn("flex items-center gap-1.5 text-xs h-8 px-2", status.className)}>
                          {status.icon}{status.label}
                        </div>
                      )
                    }
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* 公开助手库 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">公开助手库</h2>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="搜索助手..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs glass-input"
              />
            </div>
          </div>

          {filteredPublic.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bot className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">暂无已发布的助手</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPublic.map((a) => (
                  <AssistantCard
                    key={a.id}
                    a={a}
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClone(a)}
                        disabled={cloningId === a.id}
                        className="w-full h-8 text-xs glass-btn border-0"
                      >
                        {cloningId === a.id ? (
                          <div className="flex items-center gap-1.5">
                            <div className="animate-spin h-3 w-3 border-2 border-muted-foreground/30 border-t-foreground rounded-full" />
                            克隆中...
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Download className="h-3.5 w-3.5" />
                            克隆助手
                          </div>
                        )}
                      </Button>
                    }
                  />
                ))}
              </div>

              {hasMore && !searchQuery && (
                <div className="mt-6 flex justify-center">
                  <Button variant="outline" size="sm" onClick={loadMorePublic} disabled={loadingMore} className="h-8 text-xs px-6">
                    {loadingMore ? "加载中..." : "加载更多"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

      </div>
    </div>
  )
}
