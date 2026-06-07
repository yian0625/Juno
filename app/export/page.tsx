"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileJson, FileText, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { topicAPI } from "@/lib/api"
import type { Topic } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

const downloadContent = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>("")
  const [singleFormat, setSingleFormat] = useState<'markdown' | 'json'>('markdown')
  const [allFormat, setAllFormat] = useState<'markdown' | 'json'>('markdown')

  const [isExportingSingle, setIsExportingSingle] = useState(false)
  const [isExportingAll, setIsExportingAll] = useState(false)
  const [isLoadingTopics, setIsLoadingTopics] = useState(true)

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const res = await topicAPI.list({ limit: 100 })
        setTopics(res.list || [])
        if (res.list && res.list.length > 0) {
          setSelectedTopicId(String(res.list[0].id))
        }
      } catch (err: any) {
        toast({ title: "加载话题失败", description: err.message, variant: "destructive" })
      } finally {
        setIsLoadingTopics(false)
      }
    }
    loadTopics()
  }, [])

  const handleExportSingle = async () => {
    if (!selectedTopicId) {
      toast({ title: "请选择话题", variant: "destructive" })
      return
    }

    try {
      setIsExportingSingle(true)
      const res = await topicAPI.export(Number(selectedTopicId), singleFormat)
      downloadContent(res.content, res.filename)
      toast({ title: "导出成功" })
    } catch (err: any) {
      toast({ title: "导出失败", description: err.message, variant: "destructive" })
    } finally {
      setIsExportingSingle(false)
    }
  }

  const handleExportAll = async () => {
    try {
      setIsExportingAll(true)
      const res = await topicAPI.exportAll(allFormat)
      downloadContent(res.content, res.filename)
      toast({ title: "导出成功" })
    } catch (err: any) {
      toast({ title: "导出失败", description: err.message, variant: "destructive" })
    } finally {
      setIsExportingAll(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">

          {/* 单个话题导出 */}
          <div>
            <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              单个话题导出
            </h2>

            <div className="space-y-4 rounded-lg border border-border/50 p-4">
              <div className="space-y-2">
                <Label className="text-xs">选择话题</Label>
                <Select value={selectedTopicId} onValueChange={setSelectedTopicId} disabled={isLoadingTopics}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={isLoadingTopics ? "加载中..." : "选择要导出的话题"} />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map(topic => (
                      <SelectItem key={topic.id} value={String(topic.id)}>
                        {topic.title || "未命名话题"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">导出格式</Label>
                <RadioGroup value={singleFormat} onValueChange={(v) => setSingleFormat(v as 'markdown' | 'json')} className="flex gap-3">
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-border/50">
                    <RadioGroupItem value="markdown" id="single-md" />
                    <Label htmlFor="single-md" className="cursor-pointer flex items-center gap-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Markdown
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-border/50">
                    <RadioGroupItem value="json" id="single-json" />
                    <Label htmlFor="single-json" className="cursor-pointer flex items-center gap-1.5 text-xs">
                      <FileJson className="h-3.5 w-3.5 text-muted-foreground" /> JSON
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                size="sm"
                onClick={handleExportSingle}
                disabled={isExportingSingle || !selectedTopicId}
              >
                {isExportingSingle ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                导出话题
              </Button>
            </div>
          </div>

          {/* 全部导出 */}
          <div>
            <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              全部导出
            </h2>

            <div className="space-y-4 rounded-lg border border-border/50 p-4">
              <p className="text-xs text-muted-foreground">
                将您所有的对话记录打包导出。如果数据量较大，可能需要一些时间。
              </p>

              <div className="space-y-2">
                <Label className="text-xs">导出格式</Label>
                <RadioGroup value={allFormat} onValueChange={(v) => setAllFormat(v as 'markdown' | 'json')} className="flex gap-3">
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-border/50">
                    <RadioGroupItem value="markdown" id="all-md" />
                    <Label htmlFor="all-md" className="cursor-pointer flex items-center gap-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Markdown
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-border/50">
                    <RadioGroupItem value="json" id="all-json" />
                    <Label htmlFor="all-json" className="cursor-pointer flex items-center gap-1.5 text-xs">
                      <FileJson className="h-3.5 w-3.5 text-muted-foreground" /> JSON
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                size="sm"
                onClick={handleExportAll}
                disabled={isExportingAll}
              >
                {isExportingAll ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                导出全部对话
              </Button>
            </div>
          </div>

      </div>
    </div>
  )
}
