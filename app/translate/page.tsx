"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRightLeft, Copy, Trash2, Loader2, Languages } from "lucide-react"
import { getToken } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

const LANGUAGES = [
  { value: "auto", label: "自动检测" },
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "ru", label: "Русский" },
  { value: "ar", label: "العربية" },
]

const TARGET_LANGUAGES = LANGUAGES.filter(l => l.value !== "auto")

export default function TranslatePage() {
  const router = useRouter()
  const [sourceLang, setSourceLang] = useState("auto")
  const [targetLang, setTargetLang] = useState("zh")
  const [sourceText, setSourceText] = useState("")
  const [targetText, setTargetText] = useState("")
  const [isTranslating, setIsTranslating] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const handleSwapLanguages = () => {
    if (sourceLang !== "auto") {
      setSourceLang(targetLang)
      setTargetLang(sourceLang)
      setSourceText(targetText)
      setTargetText(sourceText)
    } else {
      setSourceLang(targetLang)
      setTargetLang(targetLang === "en" ? "zh" : "en")
      setSourceText(targetText)
      setTargetText("")
    }
  }

  const handleTranslate = async () => {
    if (!sourceText.trim()) return

    if (isTranslating) {
      abortRef.current?.abort()
      setIsTranslating(false)
      return
    }

    setIsTranslating(true)
    setTargetText("")

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = getToken()
      if (!token) throw new Error("未登录")

      const sourceLangLabel = LANGUAGES.find(l => l.value === sourceLang)?.label || sourceLang
      const targetLangLabel = TARGET_LANGUAGES.find(l => l.value === targetLang)?.label || targetLang

      const systemPrompt = `You are a professional translator. Translate the following text from ${sourceLangLabel} to ${targetLangLabel}. Only output the translation, nothing else.`

      const sseUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${sseUrl}/chat_api/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: sourceText }
          ],
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith("data:")) continue
          const dataStr = trimmed.slice(5).trim()

          if (dataStr === "[DONE]") break

          try {
            const parsed = JSON.parse(dataStr)
            if (parsed.error) {
              toast({ title: "错误", description: parsed.error.message || "翻译出错" })
              break
            }
            const deltaContent = parsed.choices?.[0]?.delta?.content || parsed.content
            if (deltaContent) {
              accumulated += deltaContent
              setTargetText(accumulated)
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "翻译失败", description: err.message })
      }
    } finally {
      setIsTranslating(false)
    }
  }

  const handleCopy = () => {
    if (!targetText) return
    navigator.clipboard.writeText(targetText)
    toast({ title: "已复制" })
  }

  const handleClear = () => {
    setSourceText("")
    setTargetText("")
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">

          {/* Language Selectors */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="源语言" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwapLanguages}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>

            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="目标语言" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_LANGUAGES.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Translation Area */}
          <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-[400px]">
            {/* Source */}
            <div className="flex-1 flex flex-col rounded-lg border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground">原文</span>
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  清空
                </Button>
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="输入要翻译的文本..."
                className="flex-1 w-full p-4 bg-transparent resize-none focus:outline-none text-sm leading-relaxed"
              />
            </div>

            {/* Target */}
            <div className="flex-1 flex flex-col rounded-lg border border-border/50 overflow-hidden bg-muted/20">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground">译文</span>
                <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!targetText} className="h-7 px-2 text-xs text-muted-foreground">
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  复制
                </Button>
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={targetText}
                  readOnly
                  placeholder="翻译结果将显示在这里..."
                  className="absolute inset-0 w-full h-full p-4 bg-transparent resize-none focus:outline-none text-sm leading-relaxed"
                />
                {isTranslating && !targetText && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleTranslate}
              disabled={!sourceText.trim()}
              className="px-8"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  停止翻译
                </>
              ) : (
                <>
                  <Languages className="h-4 w-4 mr-2" />
                  翻译
                </>
              )}
            </Button>
          </div>

      </div>
    </div>
  )
}
