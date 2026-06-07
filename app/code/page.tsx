"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Play, Copy, Trash2, Loader2, Code, Wand2, MessageSquare, Bug,
} from "lucide-react"
import { getToken } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "rust", label: "Rust" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
]

type ActionType = "run" | "explain" | "optimize" | "debug"

const ACTIONS: { value: ActionType; label: string; icon: React.ReactNode; prompt: string }[] = [
  {
    value: "run",
    label: "运行代码",
    icon: <Play className="h-3.5 w-3.5" />,
    prompt: "Run the following {lang} code step by step. Show the expected output. If there are errors, explain them.\n\n```{lang}\n{code}\n```",
  },
  {
    value: "explain",
    label: "解释代码",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    prompt: "Explain the following {lang} code in detail. Break down what each part does, its purpose, and any important patterns used.\n\n```{lang}\n{code}\n```",
  },
  {
    value: "optimize",
    label: "优化代码",
    icon: <Wand2 className="h-3.5 w-3.5" />,
    prompt: "Optimize the following {lang} code. Improve performance, readability, and best practices. Show the optimized version with explanations of changes.\n\n```{lang}\n{code}\n```",
  },
  {
    value: "debug",
    label: "调试代码",
    icon: <Bug className="h-3.5 w-3.5" />,
    prompt: "Debug the following {lang} code. Identify any bugs, potential issues, edge cases, and suggest fixes.\n\n```{lang}\n{code}\n```",
  },
]

export default function CodePage() {
  const [language, setLanguage] = useState("python")
  const [codeInput, setCodeInput] = useState("")
  const [result, setResult] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleAction = async (action: ActionType) => {
    if (!codeInput.trim()) {
      toast({ title: "请输入代码" })
      return
    }

    if (isProcessing) {
      abortRef.current?.abort()
      setIsProcessing(false)
      setActiveAction(null)
      return
    }

    setIsProcessing(true)
    setActiveAction(action)
    setResult("")

    const controller = new AbortController()
    abortRef.current = controller

    const actionConfig = ACTIONS.find(a => a.value === action)!
    const langLabel = LANGUAGES.find(l => l.value === language)?.label || language
    const prompt = actionConfig.prompt
      .replace(/\{lang\}/g, langLabel)
      .replace(/\{code\}/g, codeInput)

    try {
      const token = getToken()
      if (!token) throw new Error("未登录")

      const sseUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const response = await fetch(`${sseUrl}/chat_api/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a helpful code assistant. Respond in Chinese when explaining, but keep code in English." },
            { role: "user", content: prompt },
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
              toast({ title: "错误", description: parsed.error.message || "处理出错" })
              break
            }
            const deltaContent = parsed.choices?.[0]?.delta?.content || parsed.content
            if (deltaContent) {
              accumulated += deltaContent
              setResult(accumulated)
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "处理失败", description: err.message })
      }
    } finally {
      setIsProcessing(false)
      setActiveAction(null)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "已复制" })
  }

  const handleClear = () => {
    setCodeInput("")
    setResult("")
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 text-xs text-muted-foreground">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            清空
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Code Input */}
        <div className="flex-1 flex flex-col border-r border-border/50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">代码输入</span>
            <Button variant="ghost" size="sm" onClick={() => handleCopy(codeInput)} disabled={!codeInput} className="h-7 px-2 text-xs">
              <Copy className="h-3.5 w-3.5 mr-1" />
              复制
            </Button>
          </div>
          <textarea
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder={`在此输入 ${LANGUAGES.find(l => l.value === language)?.label || ""} 代码...`}
            className="flex-1 w-full p-4 bg-transparent resize-none focus:outline-none font-mono text-sm leading-relaxed"
            spellCheck={false}
          />
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/50 bg-muted/20">
            {ACTIONS.map(action => (
              <Button
                key={action.value}
                size="sm"
                variant={activeAction === action.value ? "default" : "outline"}
                onClick={() => handleAction(action.value)}
                disabled={isProcessing && activeAction !== action.value}
                className="h-7 text-xs"
              >
                {isProcessing && activeAction === action.value ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <span className="mr-1">{action.icon}</span>
                )}
                {isProcessing && activeAction === action.value ? "停止" : action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Result Output */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">输出结果</span>
            <Button variant="ghost" size="sm" onClick={() => handleCopy(result)} disabled={!result} className="h-7 px-2 text-xs">
              <Copy className="h-3.5 w-3.5 mr-1" />
              复制
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto relative">
            {result ? (
              <pre className="p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono">{result}</pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Code className="h-10 w-10 mb-3 opacity-15" />
                <p className="text-xs">输入代码并选择操作</p>
              </div>
            )}
            {isProcessing && !result && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
