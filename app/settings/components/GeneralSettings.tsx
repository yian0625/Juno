"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"

export default function GeneralSettings() {
  const {
    sendWithEnter, setSendWithEnter,
    showTopicTime, setShowTopicTime,
    messageStyle, setMessageStyle,
    saveSetting,
  } = useSettingsStore()

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>通用</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>语言</SettingRowTitle>
          <Select defaultValue="zh">
            <SelectTrigger className="h-9 text-[13px] w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>发送消息方式</SettingRowTitle>
          <Select value={sendWithEnter ? "enter" : "ctrl_enter"} onValueChange={(v) => { const val = v === "enter"; setSendWithEnter(val); saveSetting("juno_send_with_enter", String(val)) }}>
            <SelectTrigger className="h-9 text-[13px] w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="enter">Enter 发送</SelectItem>
              <SelectItem value="ctrl_enter">Ctrl + Enter 发送</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingGroup>

      <SettingGroup>
        <SettingTitle>对话</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>显示话题时间</SettingRowTitle>
          <Switch checked={showTopicTime} onCheckedChange={(c) => { setShowTopicTime(c); saveSetting("juno_show_topic_time", String(c)) }} />
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>消息样式</SettingRowTitle>
          <Select value={messageStyle} onValueChange={(v) => { setMessageStyle(v as any); saveSetting("juno_message_style", v) }}>
            <SelectTrigger className="h-9 text-[13px] w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bubble">气泡模式</SelectItem>
              <SelectItem value="plain">平铺模式</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}
