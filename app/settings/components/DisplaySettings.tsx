"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { cn } from "@/lib/utils"
import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"

export default function DisplaySettings() {
  const { theme, setTheme } = useTheme()
  const { modelIconType, setModelIconType, saveSetting } = useSettingsStore()

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>主题</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>外观模式</SettingRowTitle>
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-muted">
            {([
              { value: "light", icon: <Sun className="h-3.5 w-3.5" />, label: "浅色" },
              { value: "dark", icon: <Moon className="h-3.5 w-3.5" />, label: "深色" },
              { value: "system", icon: <Monitor className="h-3.5 w-3.5" />, label: "系统" },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-all",
                  theme === opt.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                )}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup>
        <SettingTitle>助手设置</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>模型图标类型</SettingRowTitle>
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-muted">
            {([
              { value: "model" as const, label: "模型图标" },
              { value: "emoji" as const, label: "Emoji 表情" },
              { value: "none" as const, label: "不显示" },
            ]).map(opt => (
              <button
                key={opt.value}
                onClick={() => { setModelIconType(opt.value); saveSetting("juno_model_icon_type", opt.value) }}
                className={cn(
                  "px-3 py-1 rounded-full text-[12px] font-medium transition-all",
                  modelIconType === opt.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}
