"use client"

import { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Download, User, SendHorizonal, Clock, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatStore } from "@/lib/stores"
import { isEmojiAvatar } from "@/lib/helpers"
import { assistantAPI } from "@/lib/api"
import type { Assistant } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

const REVIEW_STATUS: Record<number, { label: string; icon: React.ReactNode; className: string }> = {
  0: { label: "审核中", icon: <Clock className="h-3 w-3" />, className: "text-amber-500" },
  1: { label: "已通过", icon: <CheckCircle2 className="h-3 w-3" />, className: "text-green-500" },
  2: { label: "已拒绝", icon: <XCircle className="h-3 w-3" />, className: "text-destructive" },
}

const getReviewStatus = (status: number) => REVIEW_STATUS[status] ?? REVIEW_STATUS[0]

function AssistantCard({
  a, action,
}: {
  a: Assistant
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 px-3 py-3 rounded-xl bg-foreground/[0.02] dark:bg-white/[0.02] border border-foreground/[0.04] dark:border-white/[0.04] hover:bg-foreground/[0.04] dark:hover:bg-white/[0.04] transition-all duration-200">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0 ring-1 ring-foreground/5 dark:ring-white/10 shadow-sm">
          {isEmojiAvatar(a.avatar_url) ? (
            <AvatarFallback className="text-lg bg-foreground/[0.04] dark:bg-white/[0.06]">{a.avatar_url}</AvatarFallback>
          ) : (
            <>
              <AvatarImage src={a.avatar_url} />
              <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/10 to-primary/5 text-primary/70">{a.name.slice(0, 1)}</AvatarFallback>
            </>
          )}
        </Avatar>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground truncate">{a.name}</h3>
            {action}
          </div>
          {a.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{a.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MarketplaceTab() {
  const [myList, setMyList] = useState<Assistant[]>([])
  const [publicList, setPublicList] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [cloningId, setCloningId] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const loadAssistants = useChatStore((s) => s.loadAssistants)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [myRes, pubRes] = await Promise.all([
        assistantAPI.myLibrary(),
        assistantAPI.marketplaceList(0, pageSize),
      ])
      setMyList(myRes.list || [])
      setPublicList(pubRes.list || [])
      setTotal(pubRes.total || 0)
      setPage(1)
    } catch (err: any) {
      toast({ title: "加载助手库失败", description: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMorePublic = useCallback(async (pageNum: number) => {
    setLoadingMore(true)
    try {
      const offset = (pageNum - 1) * pageSize
      const res = await assistantAPI.marketplaceList(offset, pageSize)
      setPublicList(prev => [...prev, ...(res.list || [])])
      setTotal(res.total || 0)
      setPage(pageNum)
    } catch (err: any) {
      toast({ title: "加载失败", description: err.message })
    } finally {
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSubmitReview = async (id: number) => {
    if (submittingId) return
    setSubmittingId(id)
    try {
      await assistantAPI.submitReview(id)
      toast({ title: "已提交审核，等待管理员审核" })
      fetchAll()
    } catch (err: any) {
      toast({ title: "提交失败", description: err.message })
    } finally {
      setSubmittingId(null)
    }
  }

  const handleClone = async (id: number) => {
    if (cloningId) return
    setCloningId(id)
    try {
      await assistantAPI.clone(id)
      await loadAssistants()
      toast({ title: "已添加到我的助手" })
    } catch (err: any) {
      toast({ title: "添加失败", description: err.message })
    } finally {
      setCloningId(null)
    }
  }

  const hasMore = publicList.length < total

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="px-2 pt-1 pb-4 space-y-4">
      {/* 我的库 */}
      <div>
        <p className="px-1 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">我的库</p>
        {myList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <User className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs">暂无保存的助手，在助手列表中选择「保存到助手库」</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {myList.map((a) => {
              const isLibrary = a.assistant_type === 3
              return (
                <AssistantCard
                  key={a.id}
                  a={a}
                  action={
                    isLibrary ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {a.review_status === 2 && (
                          <span className={cn("flex items-center gap-1 text-xs", getReviewStatus(2).className)}>
                            {getReviewStatus(2).icon}{getReviewStatus(2).label}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2.5 text-xs bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary"
                          onClick={() => handleSubmitReview(a.id)}
                          disabled={submittingId === a.id}
                        >
                          {submittingId === a.id ? (
                            <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full mr-1.5" />
                          ) : (
                            <SendHorizonal className="h-3 w-3 mr-1.5" />
                          )}
                          {a.review_status === 2 ? "重新提交" : "提交审核"}
                        </Button>
                      </div>
                    ) : (
                      <span className={cn("flex items-center gap-1 text-xs", getReviewStatus(a.review_status).className)}>
                        {getReviewStatus(a.review_status).icon}{getReviewStatus(a.review_status).label}
                      </span>
                    )
                  }
                />
              )
            })}
          </div>
        )}
      </div>

      {/* 公开助手库 */}
      <div>
        <p className="px-1 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">公开助手库</p>
        {publicList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <User className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs">暂无已发布的助手</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {publicList.map((a) => (
              <AssistantCard
                key={a.id}
                a={a}
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-xs shrink-0 bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary"
                    onClick={() => handleClone(a.id)}
                    disabled={cloningId === a.id}
                  >
                    {cloningId === a.id ? (
                      <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full mr-1.5" />
                    ) : (
                      <Download className="h-3 w-3 mr-1.5" />
                    )}
                    添加
                  </Button>
                }
              />
            ))}

            {hasMore && (
              <Button
                variant="ghost"
                className="w-full h-9 text-xs text-muted-foreground hover:text-foreground bg-foreground/[0.02] hover:bg-foreground/[0.04]"
                onClick={() => fetchMorePublic(page + 1)}
                disabled={loadingMore}
              >
                {loadingMore && <div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full mr-2" />}
                加载更多
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
