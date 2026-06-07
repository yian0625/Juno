"use client"

import { useRef, useCallback } from "react"
import { Search } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useChatStore, useUIStore } from "@/lib/stores"
import { messageAPI, topicAPI } from "@/lib/api"
import { formatTime } from "@/lib/helpers"
import { toast } from "@/hooks/use-toast"

export default function SearchDialog() {
  const { searchOpen, searchQuery, setSearchOpen, setSearchQuery, setSidebarTab, setScrollToMessageId } = useUIStore()
  const searchResults = useChatStore((s) => s.searchResults)
  const setSearchResults = useChatStore((s) => s.setSearchResults)
  const isSearching = useChatStore((s) => s.isSearching)
  const setIsSearching = useChatStore((s) => s.setIsSearching)
  const currentAssistantId = useChatStore((s) => s.currentAssistantId)
  const setCurrentAssistantId = useChatStore((s) => s.setCurrentAssistantId)
  const setTopics = useChatStore((s) => s.setTopics)
  const setCurrentTopicId = useChatStore((s) => s.setCurrentTopicId)
  const loadMessages = useChatStore((s) => s.loadMessages)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const searchResult = await messageAPI.search(query.trim())
        setSearchResults(searchResult.list || [])
      } catch (err: any) {
        setSearchResults([])
        toast({ title: "搜索失败", description: err.message })
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }, [setSearchQuery, setSearchResults, setIsSearching])

  const handleResultClick = async (item: any) => {
    setSearchOpen(false)
    setSearchQuery("")
    setSearchResults([])

    const targetAssistantId = item.assistant_id
    const targetTopicId = item.topic_id

    // 1. Switch assistant and load its topics if needed
    if (targetAssistantId && targetAssistantId !== currentAssistantId) {
      setCurrentAssistantId(targetAssistantId)
      try {
        const result = await topicAPI.list({ assistant_id: targetAssistantId })
        setTopics(result.list || [])
      } catch {}
    }

    // 2. Switch to target topic and load its messages
    setSidebarTab("topics")
    setCurrentTopicId(targetTopicId)
    await loadMessages(targetTopicId)

    // 3. Scroll to the specific message
    setScrollToMessageId(String(item.id))
  }

  const handleClose = (open: boolean) => {
    setSearchOpen(open)
    if (!open) {
      setSearchQuery("")
      setSearchResults([])
    }
  }

  return (
    <Dialog open={searchOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden !rounded-2xl" showCloseButton={false}>
        <VisuallyHidden><DialogTitle>搜索对话</DialogTitle></VisuallyHidden>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40">
          <Search className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
          <input
            placeholder="搜索所有对话内容..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/60 text-[10px] text-muted-foreground/60 font-mono">ESC</kbd>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {isSearching && (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
          {!isSearching && searchResults.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <p className="text-sm">没有找到相关内容</p>
            </div>
          )}
          {!isSearching && searchResults.length === 0 && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
              <p className="text-xs">输入关键词搜索所有对话</p>
            </div>
          )}
          {!isSearching && searchResults.length > 0 && (
            <div className="p-2">
              {searchResults.map((item) => (
                  <button
                    key={item.id}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-foreground/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                    onClick={() => handleResultClick(item)}
                  >
                    <div className="flex items-center gap-2 mb-1.5 min-w-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        item.role === 'user'
                          ? 'bg-foreground/[0.07] dark:bg-white/[0.1] text-foreground/80'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {item.role === 'user' ? '用户' : (item.assistant_name || '助手')}
                      </span>
                      <span className="text-[11px] text-muted-foreground/50 truncate">{item.topic_title || '未命名话题'}</span>
                      <span className="text-[11px] text-muted-foreground/35 ml-auto shrink-0">{formatTime(item.create_time)}</span>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">{item.content}</p>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
