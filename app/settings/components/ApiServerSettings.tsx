"use client"

import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"

export default function ApiServerSettings() {
  const apiUrl = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || window.location.origin) : ""

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>API 服务器</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>当前 API 地址</SettingRowTitle>
          <span className="text-[13px] text-muted-foreground font-mono">{apiUrl || "当前域名"}</span>
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>连接状态</SettingRowTitle>
          <span className="text-[12px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">已连接</span>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}
