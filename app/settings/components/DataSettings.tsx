"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { topicAPI } from "@/lib/api"
import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"

export default function DataSettings() {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportAll = async (format: "json" | "markdown") => {
    setIsExporting(true)
    try {
      const result = await topicAPI.exportAll(format)
      const blob = new Blob([result.content], { type: format === "json" ? "application/json" : "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = result.filename || `juno-export.${format === "json" ? "json" : "md"}`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "导出成功" })
    } catch (err: any) {
      toast({ title: "导出失败", description: err.message })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>数据导出</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>导出全部对话 (JSON)</SettingRowTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleExportAll("json")} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}导出 JSON
          </Button>
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>导出全部对话 (Markdown)</SettingRowTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleExportAll("markdown")} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}导出 Markdown
          </Button>
        </SettingRow>
      </SettingGroup>
      <SettingGroup>
        <SettingTitle>缓存管理</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>清除浏览器本地缓存</SettingRowTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
            const token = localStorage.getItem("auth_token")
            const userInfo = localStorage.getItem("user_info")
            localStorage.clear()
            if (token) localStorage.setItem("auth_token", token)
            if (userInfo) localStorage.setItem("user_info", userInfo)
            toast({ title: "缓存已清除（登录信息已保留）" })
          }}>
            清除缓存
          </Button>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}
