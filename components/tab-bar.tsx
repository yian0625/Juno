"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { X, Plus, Moon, Sun, Monitor, Search, Settings, ImageIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useTabStore, useUIStore } from "@/lib/stores"
import { configAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

interface AppItem {
  name: string
  icon: string
  href: string
}

function isUrl(s: string) {
  return s.startsWith("http://") || s.startsWith("https://")
}

export function TabBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const { tabs, openTab, closeTab, hasTab, patchLabel } = useTabStore()
  const { setSearchOpen } = useUIStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [appList, setAppList] = useState<AppItem[]>([])
  const visibleAppList = useMemo(() => appList.filter((app) => app.href !== '/agents'), [appList])

  // 加载后台应用管理配置
  const loadApps = useCallback(async () => {
    try {
      const res = await configAPI.getAppList()
      setAppList(res.list || [])
    } catch {}
  }, [])

  useEffect(() => { loadApps() }, [loadApps])

  // Sync 当前路由到 tabs，用后台配置的名称
  useEffect(() => {
    if (pathname === '/agents') {
      router.replace('/')
      return
    }
    if (pathname && pathname !== '/login') {
      const label = visibleAppList.find(a => a.href === pathname)?.name
      openTab(pathname, label)
    }
  }, [pathname, router, openTab, visibleAppList])

  // appList 加载后，补全已有 tab 的名字（之前可能只存了路径）
  useEffect(() => {
    if (visibleAppList.length === 0) return
    visibleAppList.forEach(app => patchLabel(app.href, app.name))
  }, [visibleAppList, patchLabel])

  const handleTabClick = (path: string) => {
    if (path !== pathname) router.push(path)
  }

  const handleClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    const nextPath = closeTab(path)
    if (pathname === path) router.push(nextPath)
  }

  const handleOpenApp = (href: string, name: string) => {
    setDialogOpen(false)
    // 外部链接直接新标签打开，不加入 tab
    if (href.startsWith('http://') || href.startsWith('https://')) {
      window.open(href, '_blank', 'noopener,noreferrer')
      return
    }
    if (hasTab(href)) {
      router.push(href)
    } else {
      openTab(href, name)
      router.push(href)
    }
  }

  return (
    <div className="juno-chat-tabbar juno-window-drag glass-header flex items-center h-12 px-3 shrink-0 select-none gap-3">
      {/* Logo */}
      <div className="juno-brand-lockup flex items-center gap-2 shrink-0">
        <span className="font-serif text-base font-bold italic tracking-wide text-foreground">Juno</span>
      </div>

      {/* Tabs */}
      <div className="juno-no-drag juno-tab-strip flex items-center flex-1 min-w-0 overflow-x-auto gap-1 scrollbar-hide py-1">
        {tabs.map(tab => {
          const isActive = pathname === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => handleTabClick(tab.path)}
              className={cn(
                "juno-top-tab flex items-center gap-2 h-7 px-3 rounded-md text-[13px] transition-all whitespace-nowrap shrink-0 group outline-none",
                isActive
                  ? "juno-top-tab-active font-medium text-foreground bg-[var(--glass-bg-hover)] shadow-sm"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-[var(--glass-bg)]"
              )}
            >
              <span>{tab.label}</span>
              {tab.closable && (
                <span
                  onClick={(e) => handleClose(e, tab.path)}
                  className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-md transition-all",
                    isActive
                      ? "opacity-50 hover:opacity-100 hover:bg-foreground/10"
                      : "opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:bg-foreground/10"
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          )
        })}

        {/* + 打开应用弹窗 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="juno-toolbar-icon h-7 w-7 shrink-0 ml-1 rounded-md hover:bg-foreground/5"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>打开页面</TooltipContent>
        </Tooltip>
      </div>

      {/* Right actions */}
      <div className="juno-no-drag flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="juno-toolbar-icon h-8 w-8 rounded-lg hover:bg-[var(--glass-bg)]" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>搜索 (Cmd+K)</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="juno-toolbar-icon h-8 w-8 rounded-lg hover:bg-[var(--glass-bg)]">
              {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="h-3.5 w-3.5 mr-2" />浅色
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="h-3.5 w-3.5 mr-2" />深色
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="h-3.5 w-3.5 mr-2" />跟随系统
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="juno-toolbar-icon h-8 w-8 rounded-lg hover:bg-[var(--glass-bg)]"
              onClick={() => handleOpenApp('/settings', '设置')}            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>设置</TooltipContent>
        </Tooltip>
      </div>

      {/* 应用选择弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>打开页面</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 pt-2">
            {visibleAppList.map((app) => (
              <button
                key={app.href}
                onClick={() => handleOpenApp(app.href, app.name)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-colors group hover:bg-accent/50 outline-none focus-visible:outline-none"
              >
                <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all bg-muted flex items-center justify-center">
                  {isUrl(app.icon) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.icon} alt={app.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <span className="text-xs text-foreground/80 text-center leading-tight">{app.name}</span>
              </button>
            ))}
            {visibleAppList.length === 0 && (
              <div className="col-span-4 text-center py-8 text-sm text-muted-foreground">
                暂无可用应用，请在管理后台配置
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
