"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import {
  Search, MessageSquare, Loader2,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { topicAPI, messageAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

interface HistoryTopic {
  id: number
  title: string
  assistant_id: number
  create_time: number
  update_time: number
}

interface SearchResult {
  id: number
  topic_id: number
  role: string
  content: string
  create_time: number
}

function formatDate(ts: number): string {
  if (!ts) return ""
  const d = new Date(ts * 1000)
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }) +
    " " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
}

export default function HistoryPage() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [topics, setTopics] = useState<HistoryTopic[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadTopics = async () => {
    setIsLoading(true)
    try {
      const result = await topicAPI.list({ limit: 100 })
      setTopics(result.list || [])
    } catch (err: any) {
      toast({ title: "加载失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadTopics() }, [])

  const handleSearch = async () => {
    if (!searchText.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const result = await messageAPI.search(searchText.trim())
      setSearchResults(result.list || [])
    } catch (err: any) {
      toast({ title: "搜索失败", description: err.message })
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { if (searchText.trim()) handleSearch() }, 500)
    return () => clearTimeout(timer)
  }, [searchText])

  const isSearchMode = searchText.trim().length > 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索所有对话记录..."
            className="h-9 pl-10 text-sm glass-input"
          />
        </div>

        {isSearchMode ? (
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              {isSearching ? "搜索中..." : `找到 ${searchResults.length} 条结果`}
            </p>
            {isSearching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">未找到匹配的消息</p>
            ) : (
              <div className="space-y-1">
                {searchResults.map(msg => (
                  <div
                    key={msg.id}
                    className="glass-list-item cursor-pointer transition-colors"
                    onClick={() => router.push(`/?topic=${msg.topic_id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
                        msg.role === "user" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {msg.role === "user" ? "我" : "AI"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatDate(msg.create_time)}</span>
                    </div>
                    <p className="text-sm line-clamp-3">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              {isLoading ? "加载中..." : `共 ${topics.length} 个对话`}
            </p>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : topics.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">暂无对话记录</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {topics.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 glass-list-item cursor-pointer"
                    onClick={() => router.push(`/?topic=${t.id}`)}
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title || "未命名对话"}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(t.update_time || t.create_time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
