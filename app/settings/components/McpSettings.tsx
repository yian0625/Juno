"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"

export default function McpSettings() {
  const router = useRouter()

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>MCP 服务器</SettingTitle>
        <SettingDivider />
        <p className="text-sm text-muted-foreground py-2">MCP (Model Context Protocol) 服务器可以为 AI 提供额外的工具和数据源。</p>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>管理 MCP 服务器</SettingRowTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push("/mcp")}>
            前往管理
          </Button>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}
