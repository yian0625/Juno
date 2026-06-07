"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { assistantAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Check, Clock, User, XCircle } from "lucide-react"

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ReviewDialog({ open, onOpenChange }: ReviewDialogProps) {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchReviews = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const res = await assistantAPI.reviewList(1, 50, -1)
      setReviews(res.list || [])
    } catch (err: any) {
      toast({ title: "获取审核列表失败", description: err.message })
    } finally {
      setLoading(false)
    }
  }, [open])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const formatDate = (ts: number) => {
    if (!ts) return ""
    const d = new Date(ts * 1000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const statusConfig = (status: number) => {
    if (status === 1) return { label: "已通过", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: Check }
    if (status === 2) return { label: "已拒绝", className: "bg-destructive/10 text-destructive", icon: XCircle }
    return { label: "待审核", className: "bg-primary/10 text-primary", icon: Clock }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>我的审核记录</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Check className="h-12 w-12 mb-4 opacity-20" />
              <p>暂无提交审核的助手</p>
            </div>
          ) : (
            reviews.map((review) => {
              const status = statusConfig(review.status)
              const StatusIcon = status.icon
              return (
                <div key={review.id} className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/[0.05] space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium text-base truncate">{review.assistant_name || `助手 #${review.assistant_id}`}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {review.assistant_description || '无描述'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ${status.className}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  </div>

                  {review.status === 2 && review.reject_reason && (
                    <div className="rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2 text-sm text-destructive">
                      {review.reject_reason}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-foreground/[0.05]">
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      <span>助手 ID: {review.assistant_id}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDate(review.create_time)}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
