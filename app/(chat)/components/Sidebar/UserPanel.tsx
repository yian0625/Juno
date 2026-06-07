"use client"

import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { LogOut, ShieldCheck } from "lucide-react"
import { useChatStore } from "@/lib/stores"
import { removeToken, removeUser } from "@/lib/api"
import { useState } from "react"
import ReviewDialog from "../Dialogs/ReviewDialog"

export default function UserPanel() {
  const router = useRouter()
  const user = useChatStore((s) => s.user)
  const [reviewOpen, setReviewOpen] = useState(false)

  const handleLogout = () => {
    removeToken()
    removeUser()
    router.push("/login")
  }

  return (
    <>
      <div className="juno-user-panel flex items-center gap-2.5 px-2.5 py-2 shrink-0 mx-2 mb-2 transition-colors group">
        <Avatar className="juno-user-avatar h-8 w-8 shrink-0">
          <AvatarFallback className="text-sm font-semibold bg-primary text-primary-foreground">
            {user?.nickname?.slice(0, 1) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="juno-user-name text-sm font-medium truncate">{user?.nickname || "用户"}</p>
          <p className="juno-user-status text-xs text-muted-foreground truncate">
            <span className="juno-user-status-dot" />
            在线
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="juno-user-action flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent>审核管理</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleLogout}
              className="juno-user-action flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent>退出登录</TooltipContent>
        </Tooltip>
      </div>
      <ReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} />
    </>
  )
}
