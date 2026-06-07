"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2, Settings2, ChevronDown, Search,
} from "lucide-react"
import { providerAPI } from "@/lib/api"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"
import { cn } from "@/lib/utils"
import type { AssistantModelProfile } from "@/lib/types"

function getProviderColor(provider: string): string {
  const map: Record<string, string> = {
    "OpenAI": "bg-emerald-500",
    "Anthropic": "bg-orange-500",
    "Google": "bg-blue-500",
    "DeepSeek": "bg-indigo-500",
    "Moonshot": "bg-yellow-500",
    "Qwen": "bg-purple-500",
    "Doubao": "bg-sky-500",
  }
  return map[provider] || "bg-zinc-500"
}

// ===== Model Selector Popover =====

function ProfileSelectorPopover({
  profiles, value, onSelect, onClose, anchorRef,
}: {
  profiles: AssistantModelProfile[]
  value: string
  onSelect: (alias: string) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}) {
  const [search, setSearch] = useState("")
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose, anchorRef])

  const filtered = useMemo(() => {
    if (!search) return profiles
    const q = search.toLowerCase()
    return profiles.filter(p =>
      p.name.toLowerCase().includes(q) || p.chat_model_alias.toLowerCase().includes(q) || p.provider_type.toLowerCase().includes(q)
    )
  }, [profiles, search])

  const grouped = useMemo(() => {
    const groups = new Map<string, AssistantModelProfile[]>()
    filtered.forEach(p => {
      const g = p.provider_type || "Other"
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(p)
    })
    return Array.from(groups.entries())
  }, [filtered])

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-lg border border-border bg-background shadow-lg max-h-[320px] flex flex-col"
    >
      <div className="p-2 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索模型方案..."
            className="pl-8 h-8 text-[13px]"
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {grouped.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">无匹配结果</p>
        ) : (
          grouped.map(([groupName, gProfiles]) => (
            <div key={groupName}>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-sm", getProviderColor(groupName))} />
                {groupName}
              </div>
              {gProfiles.map(p => (
                <div
                  key={p.id}
                  className={cn(
                    "px-3 py-2 text-[13px] cursor-pointer flex items-center gap-2 transition-colors",
                    p.chat_model_alias === value ? "bg-primary/10 text-primary" : "hover:bg-accent",
                  )}
                  onClick={() => { onSelect(p.chat_model_alias); onClose() }}
                >
                  {p.chat_model_icon_url && (
                    <img src={p.chat_model_icon_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                  )}
                  <span className="truncate flex-1">{p.name}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ===== Model Selector Row =====

function ModelSelectorRow({
  label, description, value, profiles, isLoading,
  onChange, showGear, onGearClick,
}: {
  label: string
  description: string
  value: string
  profiles: AssistantModelProfile[]
  isLoading: boolean
  onChange: (alias: string) => void
  showGear?: boolean
  onGearClick?: () => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  const selectedProfile = profiles.find(p => p.chat_model_alias === value)
  const displayText = selectedProfile
    ? `${selectedProfile.name}`
    : value || "未选择"

  return (
    <div className="py-1">
      <SettingRow>
        <div className="min-w-0">
          <SettingRowTitle>{label}</SettingRowTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </SettingRow>
      <div className="relative mt-2" ref={triggerRef}>
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "flex-1 flex items-center justify-between h-9 px-3 rounded-md border border-border/60 cursor-pointer transition-colors",
              "hover:border-border text-[13px]",
              open && "border-primary ring-1 ring-primary/20",
            )}
            onClick={() => setOpen(!open)}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-center gap-2 truncate">
                {selectedProfile?.chat_model_icon_url && (
                  <img src={selectedProfile.chat_model_icon_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                )}
                <span className={cn("truncate", !value && "text-muted-foreground")}>{displayText}</span>
              </div>
            )}
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2 transition-transform", open && "rotate-180")} />
          </div>
          {showGear && (
            <button
              className="h-9 w-9 flex items-center justify-center rounded-md border border-border/60 hover:bg-accent transition-colors shrink-0"
              onClick={onGearClick}
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {open && (
          <ProfileSelectorPopover
            profiles={profiles}
            value={value}
            onSelect={onChange}
            onClose={() => setOpen(false)}
            anchorRef={triggerRef}
          />
        )}
      </div>
    </div>
  )
}

// ===== Parameter Config Dialog =====

function ParamConfigDialog({
  open, onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const {
    defaultTemperature, setDefaultTemperature,
    defaultMaxTokens, setDefaultMaxTokens,
    defaultTopP, setDefaultTopP,
    saveSetting,
  } = useSettingsStore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0" showCloseButton>
        <div className="px-5 pt-5 pb-3">
          <DialogHeader><DialogTitle className="text-base">模型参数配置</DialogTitle></DialogHeader>
        </div>
        <div className="px-5 pb-5 space-y-4">
          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium">Temperature</span>
              <span className="text-[13px] text-muted-foreground tabular-nums">{defaultTemperature}</span>
            </div>
            <input type="range" min="0" max="2" step="0.1"
              value={defaultTemperature}
              onChange={e => setDefaultTemperature(parseFloat(e.target.value))}
              onMouseUp={e => saveSetting("juno_default_temperature", (e.target as HTMLInputElement).value)}
              onTouchEnd={e => saveSetting("juno_default_temperature", (e.target as HTMLInputElement).value)}
              className="w-full accent-primary h-1.5"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>精确</span><span>创意</span>
            </div>
          </div>

          {/* Top P */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium">Top P</span>
              <span className="text-[13px] text-muted-foreground tabular-nums">{defaultTopP}</span>
            </div>
            <input type="range" min="0" max="1" step="0.05"
              value={defaultTopP}
              onChange={e => setDefaultTopP(parseFloat(e.target.value))}
              onMouseUp={e => saveSetting("juno_default_top_p", (e.target as HTMLInputElement).value)}
              onTouchEnd={e => saveSetting("juno_default_top_p", (e.target as HTMLInputElement).value)}
              className="w-full accent-primary h-1.5"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0</span><span>1</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium">Max Tokens</span>
            </div>
            <Input
              type="number"
              value={defaultMaxTokens}
              onChange={e => setDefaultMaxTokens(e.target.value)}
              onBlur={e => saveSetting("juno_default_max_tokens", e.target.value)}
              className="h-9 text-[13px]"
              placeholder="4096"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ===== Main Component =====

export default function ModelSettings() {
  const {
    defaultModel, setDefaultModel,
    topicModel, setTopicModel,
    translateModel, setTranslateModel,
    saveSetting,
  } = useSettingsStore()

  const [profiles, setProfiles] = useState<AssistantModelProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showParamDialog, setShowParamDialog] = useState(false)

  const loadProfiles = async () => {
    setIsLoading(true)
    try {
      const result = await providerAPI.listAssistantModelProfiles()
      setProfiles(result.list || [])
    } catch { setProfiles([]) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadProfiles() }, [])

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>默认模型</SettingTitle>
        <SettingDivider />

        <ModelSelectorRow
          label="默认助手模型"
          description="新对话默认使用的模型方案"
          value={defaultModel}
          profiles={profiles}
          isLoading={isLoading}
          onChange={v => { setDefaultModel(v); saveSetting("juno_default_model", v) }}
          showGear
          onGearClick={() => setShowParamDialog(true)}
        />

        <SettingDivider />

        <ModelSelectorRow
          label="快速模型"
          description="用于话题命名、关键词提取等简单任务"
          value={topicModel}
          profiles={profiles}
          isLoading={isLoading}
          onChange={v => { setTopicModel(v); saveSetting("juno_topic_model", v) }}
        />

        <SettingDivider />

        <ModelSelectorRow
          label="翻译模型"
          description="用于翻译服务"
          value={translateModel}
          profiles={profiles}
          isLoading={isLoading}
          onChange={v => { setTranslateModel(v); saveSetting("juno_translate_model", v) }}
        />
      </SettingGroup>

      <ParamConfigDialog open={showParamDialog} onOpenChange={setShowParamDialog} />
    </SettingContainer>
  )
}
