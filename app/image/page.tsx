"use client"

import { useState, useEffect, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { imageAPI } from "@/lib/api"
import { Sparkles, Download, Loader2, ImageIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const SIZES = [
  { label: "1:1", value: "1024x1024" },
  { label: "3:2", value: "1536x1024" },
  { label: "2:3", value: "1024x1536" },
]

interface Plan {
  id: number
  name: string
}

interface GeneratedItem {
  prompt: string
  images: string[]
  planName: string
}

export default function ImagePage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
  const [size, setSize] = useState("1024x1024")
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<GeneratedItem[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    imageAPI.listPlans().then(r => {
      const list = r.list || []
      setPlans(list)
      if (list.length > 0) setSelectedPlan(list[0].id)
    }).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedPlan || loading) return
    setLoading(true)
    try {
      const plan = plans.find(p => p.id === selectedPlan)
      const res = await imageAPI.generate({ plan_id: selectedPlan, prompt: prompt.trim(), size, n: 1 })
      const images = res.images || []
      if (images.length > 0) {
        setHistory(prev => [{ prompt: prompt.trim(), images, planName: plan?.name || "" }, ...prev])
      }
    } catch (err: any) {
      toast({ title: "生成失败", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (url: string, idx: number) => {
    const a = document.createElement("a")
    a.href = url
    a.download = `image-${idx}.png`
    a.target = "_blank"
    a.click()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Output area */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {history.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
            <ImageIcon className="h-16 w-16" />
            <p className="text-sm">输入描述，生成图片</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">正在生成...</p>
              </div>
            )}
            {history.map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">{item.planName}</span>
                  <p className="text-sm text-foreground/80 line-clamp-1">{item.prompt}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {item.images.map((url, j) => (
                    <div key={j} className="relative group rounded-xl overflow-hidden bg-muted aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={item.prompt} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => handleDownload(url, j)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          下载
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border/50 bg-background px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Plan selector */}
            <div className="flex items-center gap-1.5">
              {plans.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    selectedPlan === p.id
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  {p.name}
                </button>
              ))}
              {plans.length === 0 && <span className="text-xs text-muted-foreground">请在管理后台配置生图方案</span>}
            </div>

            {/* Size selector */}
            <div className="flex items-center gap-1 ml-auto">
              {SIZES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSize(s.value)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs transition-all",
                    size === s.value
                      ? "bg-foreground/10 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="描述你想要的画面..."
              rows={2}
              disabled={loading}
              className="resize-none pr-24 text-sm bg-muted/30 border-border/50 focus-visible:ring-1 focus-visible:ring-foreground/20"
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault()
                  handleGenerate()
                }
              }}
            />
            <Button
              size="sm"
              className="absolute right-2 bottom-2 h-8 px-3 gap-1.5 text-xs"
              onClick={handleGenerate}
              disabled={!prompt.trim() || !selectedPlan || loading || plans.length === 0}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              生成
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/40">⌘↵ 提交</p>
        </div>
      </div>
    </div>
  )
}
