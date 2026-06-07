"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Play, Square, ExternalLink, Loader2, RefreshCw, X,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const DEFAULT_PORT = 18790
const STORAGE_KEY = "openclaw_config"

interface OpenClawConfig {
  host: string
  port: number
  token: string
}

function getStoredConfig(): OpenClawConfig {
  if (typeof window === "undefined") return { host: "127.0.0.1", port: DEFAULT_PORT, token: "" }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { host: "127.0.0.1", port: DEFAULT_PORT, token: "" }
}

function saveConfig(config: OpenClawConfig) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

type GatewayStatus = "unknown" | "checking" | "running" | "stopped"

export default function OpenClawPage() {
  const [config, setConfig] = useState<OpenClawConfig>({ host: "127.0.0.1", port: DEFAULT_PORT, token: "" })
  const [status, setStatus] = useState<GatewayStatus>("unknown")
  const [showDashboard, setShowDashboard] = useState(false)

  useEffect(() => {
    setConfig(getStoredConfig())
  }, [])

  const gatewayUrl = `http://${config.host}:${config.port}`

  const checkHealth = useCallback(async () => {
    setStatus("checking")
    try {
      const response = await fetch(`${gatewayUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.status === "live") {
          setStatus("running")
          return
        }
      }
      setStatus("stopped")
    } catch {
      setStatus("stopped")
    }
  }, [gatewayUrl])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  const handleSaveConfig = () => {
    saveConfig(config)
    toast({ title: "配置已保存" })
    checkHealth()
  }

  const handleOpenDashboard = () => {
    if (status !== "running") {
      toast({ title: "网关未运行", description: "请先确保 OpenClaw 网关已启动" })
      return
    }
    setShowDashboard(true)
  }

  const handleOpenExternal = () => {
    let url = gatewayUrl
    if (config.token) {
      url += `#token=${encodeURIComponent(config.token)}`
    }
    window.open(url, "_blank")
  }

  if (showDashboard) {
    let dashboardUrl = gatewayUrl
    if (config.token) {
      dashboardUrl += `#token=${encodeURIComponent(config.token)}`
    }
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between h-10 px-4 shrink-0 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐷</span>
            <span className="font-medium text-sm">OpenClaw Dashboard</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenExternal}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDashboard(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <iframe src={dashboardUrl} className="flex-1 w-full border-0" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
        <div className="max-w-lg mx-auto py-12 px-6">
          {/* Logo & Description */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-3xl mb-4">
              🐷
            </div>
            <h2 className="text-xl font-semibold mb-2">OpenClaw</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              OpenClaw 是一个 AI 网关服务，可以统一管理多个 AI 模型提供商，提供统一的 API 接口。
            </p>
            <a
              href="https://docs.openclaw.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline mt-2 flex items-center gap-1"
            >
              查看文档 <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between rounded-lg p-3 mb-6 border border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                status === "running" ? "bg-primary" :
                status === "checking" ? "bg-muted-foreground animate-pulse" :
                "bg-destructive"
              )} />
              <span className="text-sm font-medium">
                {status === "running" ? "网关运行中" :
                 status === "checking" ? "检查中..." :
                 status === "stopped" ? "网关未连接" :
                 "未知状态"}
              </span>
              {status === "running" && (
                <span className="text-xs text-muted-foreground font-mono">:{config.port}</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={checkHealth} className="h-7 px-2">
              <RefreshCw className={cn("h-3.5 w-3.5", status === "checking" && "animate-spin")} />
            </Button>
          </div>

          {/* Config */}
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">网关地址</Label>
                <Input
                  value={config.host}
                  onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                  className="h-9 text-sm font-mono"
                  placeholder="127.0.0.1"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">端口</Label>
                <Input
                  type="number"
                  value={config.port}
                  onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || DEFAULT_PORT }))}
                  className="h-9 text-sm font-mono"
                  placeholder="18790"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">认证 Token (可选)</Label>
              <Input
                type="password"
                value={config.token}
                onChange={(e) => setConfig(prev => ({ ...prev, token: e.target.value }))}
                className="h-9 text-sm font-mono"
                placeholder="留空则不认证"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveConfig} className="w-full h-9 text-xs">
              保存配置并检查连接
            </Button>
          </div>

          {/* Tips */}
          <div className="rounded-lg p-3 bg-muted/30 text-xs text-muted-foreground leading-relaxed mb-8 border border-border/50">
            <p className="mb-1 font-medium text-foreground/70">使用提示</p>
            <ul className="list-disc list-inside space-y-1">
              <li>请确保 OpenClaw 网关已在本地或服务器上启动</li>
              <li>默认端口为 18790，可在 OpenClaw 配置中修改</li>
              <li>连接成功后可打开 Dashboard 管理模型和提供商</li>
            </ul>
          </div>

          {/* Action */}
          <Button
            onClick={handleOpenDashboard}
            disabled={status !== "running"}
            className="w-full"
          >
            {status === "checking" ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />检查中...</>
            ) : status === "running" ? (
              <><Play className="h-4 w-4 mr-2" />打开 Dashboard</>
            ) : (
              <><Square className="h-4 w-4 mr-2" />网关未连接</>
            )}
          </Button>
      </div>
    </div>
  )
}
