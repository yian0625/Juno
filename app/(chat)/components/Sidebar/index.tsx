"use client"

import { useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/lib/stores"
import AssistantsTab from "./AssistantsTab"
import TopicsTab from "./TopicsTab"
import UserPanel from "./UserPanel"

export default function Sidebar() {
  const { sidebarOpen, sidebarTab, setSidebarTab, sidebarWidth, setSidebarWidth } = useUIStore()
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  useEffect(() => {
    const saved = localStorage.getItem('juno-sidebar-width-v2')
    if (saved) {
      const n = parseInt(saved, 10)
      if (!isNaN(n) && n >= 220 && n <= 320) setSidebarWidth(n)
    }
  }, [setSidebarWidth])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      setSidebarWidth(startWidth.current + delta)
    }

    const handleMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [setSidebarWidth])

  return (
    <div
      className={cn(
        "juno-chat-sidebar glass-sidebar flex flex-col shrink-0 relative",
        sidebarOpen ? "transition-[width] duration-200" : "w-0 overflow-hidden transition-all duration-200"
      )}
      style={sidebarOpen ? { width: sidebarWidth } : undefined}
    >
      {/* Tab switcher */}
      <div className="juno-sidebar-switcher flex gap-1 p-0.5 mx-2.5 mt-2.5 mb-2 rounded-[10px] bg-foreground/[0.04] dark:bg-white/[0.04] shrink-0">
        <button
          className={cn(
            "juno-sidebar-switcher-button flex-1 h-8 text-[13px] font-medium text-center rounded-[8px] transition-colors duration-150 outline-none",
            sidebarTab === "assistants"
              ? "is-active text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setSidebarTab("assistants")}
        >
          助手
        </button>
        <button
          className={cn(
            "juno-sidebar-switcher-button flex-1 h-8 text-[13px] font-medium text-center rounded-[8px] transition-colors duration-150 outline-none",
            sidebarTab === "topics"
              ? "is-active text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setSidebarTab("topics")}
        >
          话题
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {sidebarTab === "assistants" ? <AssistantsTab /> : <TopicsTab />}
      </div>

      <UserPanel />

      {/* Resize handle */}
      {sidebarOpen && (
        <div
          onMouseDown={handleMouseDown}
          className="juno-no-drag absolute top-0 right-0 w-1 h-full cursor-col-resize group z-10 hover:bg-primary/20 active:bg-primary/30 transition-colors duration-150"
        />
      )}
    </div>
  )
}
