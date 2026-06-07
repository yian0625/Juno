"use client"

import { useSettingsStore } from "@/lib/stores/settings-store"
import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"

export default function ShortcutSettings() {
  const { sendWithEnter } = useSettingsStore()

  const shortcuts = [
    { action: "发送消息", keys: sendWithEnter ? "Enter" : "Ctrl + Enter" },
    { action: "换行", keys: sendWithEnter ? "Shift + Enter" : "Enter" },
    { action: "新建对话", keys: "Ctrl + N" },
    { action: "搜索消息", keys: "Ctrl + F" },
    { action: "打开设置", keys: "Ctrl + ," },
    { action: "清除输入", keys: "Escape" },
    { action: "复制代码块", keys: "点击代码块右上角按钮" },
    { action: "重新生成", keys: "点击消息下方按钮" },
  ]

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>快捷键</SettingTitle>
        <SettingDivider />
        {shortcuts.map((item, i) => (
          <div key={i}>
            {i > 0 && <SettingDivider />}
            <SettingRow>
              <SettingRowTitle>{item.action}</SettingRowTitle>
              <div className="flex gap-1">
                {item.keys.split(" + ").map((k, j) => (
                  <kbd key={j} className="px-2 py-0.5 rounded bg-muted text-[12px] font-mono text-muted-foreground border border-border/50">{k}</kbd>
                ))}
              </div>
            </SettingRow>
          </div>
        ))}
      </SettingGroup>
    </SettingContainer>
  )
}
