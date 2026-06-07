"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"

export default function DocProcessSettings() {
  const router = useRouter()

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>文档处理</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>知识库管理</SettingRowTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push("/knowledge")}>
            前往管理
          </Button>
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>支持格式</SettingRowTitle>
          <span className="text-[13px] text-muted-foreground">TXT, MD, PDF</span>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}
