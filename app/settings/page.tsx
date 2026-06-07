"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Cloud, Package, Settings2, MonitorCog, HardDrive,
  Search, Brain, Server, FileCode, Command, PictureInPicture2,
  TextCursorInput, Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/lib/stores/settings-store"

import ProviderSettings from "./components/ProviderSettings"
import ModelSettings from "./components/ModelSettings"
import GeneralSettings from "./components/GeneralSettings"
import DisplaySettings from "./components/DisplaySettings"
import DataSettings from "./components/DataSettings"
import WebSearchSettings from "./components/WebSearchSettings"
import MemorySettings from "./components/MemorySettings"
import ShortcutSettings from "./components/ShortcutSettings"
import McpSettings from "./components/McpSettings"
import ApiServerSettings from "./components/ApiServerSettings"
import DocProcessSettings from "./components/DocProcessSettings"
import { QuickAssistantSettings, SelectionAssistantSettings } from "./components/AssistantSettings"
import AboutSettings from "./components/AboutSettings"

type SettingsTab =
  | "provider" | "model"
  | "general" | "display" | "data"
  | "mcp" | "websearch" | "memory" | "api-server" | "docprocess" | "shortcut"
  | "quickAssistant" | "selectionAssistant"
  | "about"

interface NavItem {
  id: SettingsTab
  label: string
  icon: React.ReactNode
}

const NAV_GROUP_1: NavItem[] = [
  { id: "provider", label: "模型服务", icon: <Cloud size={18} /> },
  { id: "model", label: "默认模型", icon: <Package size={18} /> },
]

const NAV_GROUP_2: NavItem[] = [
  { id: "general", label: "常规设置", icon: <Settings2 size={18} /> },
  { id: "display", label: "显示设置", icon: <MonitorCog size={18} /> },
  { id: "data", label: "数据设置", icon: <HardDrive size={18} /> },
]


const NAV_GROUP_3: NavItem[] = [
  { id: "websearch", label: "网络搜索", icon: <Search size={18} /> },
  { id: "memory", label: "全局记忆", icon: <Brain size={18} /> },
  { id: "api-server", label: "API 服务器", icon: <Server size={18} /> },
  { id: "docprocess", label: "文档处理", icon: <FileCode size={18} /> },
  { id: "shortcut", label: "快捷键", icon: <Command size={18} /> },
]

const NAV_GROUP_4: NavItem[] = [
  { id: "quickAssistant", label: "快捷助手", icon: <PictureInPicture2 size={18} /> },
  { id: "selectionAssistant", label: "划词助手", icon: <TextCursorInput size={18} /> },
]

const NAV_GROUP_5: NavItem[] = [
  { id: "about", label: "关于我们", icon: <Info size={18} /> },
]

export default function SettingsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>("provider")
  const { loadPreferences } = useSettingsStore()

  useEffect(() => {
    setMounted(true)
    loadPreferences()
  }, [])

  if (!mounted) return null

  const renderNavItem = (item: NavItem) => (
    <button
      key={item.id}
      onClick={() => setActiveTab(item.id)}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all border border-transparent cursor-pointer select-none",
        "[&>svg]:opacity-60 [&>svg]:shrink-0",
        activeTab === item.id
          ? "bg-[var(--glass-bg-hover)] border-[var(--glass-border-subtle)] text-foreground [&>svg]:opacity-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          : "text-foreground/70 hover:bg-[var(--glass-bg)] hover:text-foreground"
      )}
    >
      {item.icon}
      {item.label}
    </button>
  )

  const renderNavDivider = (key: string) => (
    <div key={key} className="border-t border-border/20 my-1.5 mx-2" />
  )

  const renderContent = () => {
    switch (activeTab) {
      case "provider": return <ProviderSettings />
      case "model": return <ModelSettings />
      case "general": return <GeneralSettings />
      case "display": return <DisplaySettings />
      case "data": return <DataSettings />
      case "websearch": return <WebSearchSettings />
      case "memory": return <MemorySettings />
      case "api-server": return <ApiServerSettings />
      case "docprocess": return <DocProcessSettings />
      case "shortcut": return <ShortcutSettings />
      case "mcp": return <McpSettings />
      case "quickAssistant": return <QuickAssistantSettings />
      case "selectionAssistant": return <SelectionAssistantSettings />
      case "about": return <AboutSettings />
      default: return null
    }
  }

  return (
    <div className="h-full flex">
        {/* Nav */}
        <div className="min-w-[var(--settings-nav-width,180px)] w-[180px] shrink-0 glass-sidebar p-3 overflow-y-auto flex flex-col gap-0.5 select-none">
          {NAV_GROUP_1.map(renderNavItem)}
          {renderNavDivider("d1")}
          {NAV_GROUP_2.map(renderNavItem)}
          {renderNavDivider("d2")}
          {NAV_GROUP_3.map(renderNavItem)}
          {renderNavDivider("d3")}
          {NAV_GROUP_4.map(renderNavItem)}
          {renderNavDivider("d4")}
          {NAV_GROUP_5.map(renderNavItem)}
        </div>

        {/* Content */}
        {renderContent()}
    </div>
  )
}
