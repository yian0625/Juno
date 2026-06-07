"use client"

import { Switch } from "@/components/ui/switch"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"

export function QuickAssistantSettings() {
  const { quickAssistantEnabled, setQuickAssistantEnabled, saveSetting } = useSettingsStore()

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>快捷助手</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>启用快捷助手</SettingRowTitle>
          <Switch checked={quickAssistantEnabled} onCheckedChange={(c) => { setQuickAssistantEnabled(c); saveSetting("juno_quick_assistant", String(c)) }} />
        </SettingRow>
        <SettingDivider />
        <p className="text-[12px] text-muted-foreground">快捷助手允许您在任意页面快速唤起 AI 对话窗口</p>
      </SettingGroup>
    </SettingContainer>
  )
}

export function SelectionAssistantSettings() {
  const { selectionAssistantEnabled, setSelectionAssistantEnabled, saveSetting } = useSettingsStore()

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>划词助手</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>启用划词助手</SettingRowTitle>
          <Switch checked={selectionAssistantEnabled} onCheckedChange={(c) => { setSelectionAssistantEnabled(c); saveSetting("juno_selection_assistant", String(c)) }} />
        </SettingRow>
        <SettingDivider />
        <p className="text-[12px] text-muted-foreground">选中文本后自动弹出 AI 操作菜单（翻译、解释、总结等）</p>
      </SettingGroup>
    </SettingContainer>
  )
}
