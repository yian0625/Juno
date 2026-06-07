"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Check,
  ChevronDown,
  Hand,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Square,
  Paperclip,
  X,
  FileText,
  ImageIcon,
  ImageOff,
  type LucideIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useChatStore } from "@/lib/stores"
import { uploadAPI, assistantAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import type { AgentApprovalMode } from "@/lib/stores"

interface Props {
  onSend: () => void
  onStop: () => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}

const AGENT_APPROVAL_OPTIONS: Array<{
  value: AgentApprovalMode
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
}> = [
  {
    value: 'ask',
    label: '需要询问批准',
    shortLabel: '询问批准',
    description: '每次编辑外部文件和使用网络时都需要询问',
    icon: Hand,
  },
  {
    value: 'auto',
    label: '自动帮我批准',
    shortLabel: '自动批准',
    description: '仅在检测到可能不安全的操作时才询问',
    icon: ShieldAlert,
  },
  {
    value: 'full',
    label: '完全访问权限',
    shortLabel: '完全访问',
    description: '不受限制地访问互联网和你电脑上的任何文件',
    icon: ShieldCheck,
  },
  {
    value: 'readonly',
    label: '只读模式',
    shortLabel: '只读',
    description: '只能读取和检索，不修改文件',
    icon: Shield,
  },
]

export default function Inputbar({ onSend, onStop, inputRef }: Props) {
  const isStreaming = useChatStore((s) => s.isStreaming)
  const currentAssistantId = useChatStore((s) => s.currentAssistantId)
  const assistants = useChatStore((s) => s.assistants)
  const setAssistants = useChatStore((s) => s.setAssistants)
  const currentModel = useChatStore((s) => s.currentModel)
  const allModelProfiles = useChatStore((s) => s.allModelProfiles)
  const uploadedFiles = useChatStore((s) => s.uploadedFiles)
  const setUploadedFiles = useChatStore((s) => s.setUploadedFiles)
  const isUploading = useChatStore((s) => s.isUploading)
  const setIsUploading = useChatStore((s) => s.setIsUploading)
  const agentApprovalMode = useChatStore((s) => s.agentApprovalMode)
  const setAgentApprovalMode = useChatStore((s) => s.setAgentApprovalMode)

  const loadAssistants = useChatStore((s) => s.loadAssistants)

  // 判断当前模型方案是否支持图片生成
  const currentAssistant = assistants.find((a) => a.id === currentAssistantId)
  const currentProfile = allModelProfiles.find((p) => p.chat_model_alias === currentModel)
  const profileSupportsImage = currentProfile?.image_generation_enabled === 1
  const imageGenEnabled = currentAssistant?.image_generation_enabled === 1
  const selectedApprovalOption = AGENT_APPROVAL_OPTIONS.find((item) => item.value === agentApprovalMode) || AGENT_APPROVAL_OPTIONS[0]
  const SelectedApprovalIcon = selectedApprovalOption.icon

  // Local input state to avoid re-rendering the entire app on every keystroke
  const [localInput, setLocalInput] = useState('')
  const inputValueRef = useRef('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync from store (e.g. EmptyState sets a sample question, or send clears it)
  useEffect(() => {
    const unsub = useChatStore.subscribe((state, prev) => {
      if (state.inputValue !== prev.inputValue && state.inputValue !== inputValueRef.current) {
        setLocalInput(state.inputValue)
        inputValueRef.current = state.inputValue
      }
    })
    return unsub
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const sendWithEnter = localStorage.getItem("juno_send_with_enter") !== "false"
    if (sendWithEnter) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        onSend()
      }
    } else {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onSend()
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "文件过大", description: `${file.name} 超过 10MB 限制` })
          continue
        }
        const result = await uploadAPI.uploadFile(file)
        setUploadedFiles((prev) => [...prev, result])
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '上传失败'
      toast({ title: "上传失败", description: message })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  if (currentAssistantId <= 0) return null

  return (
    <div className="juno-chat-composer shrink-0">
      <div className="juno-composer max-w-[860px] mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />

        <div className="juno-composer-input-surface">
          {/* Uploaded files preview */}
          {uploadedFiles.length > 0 && (
            <div className="juno-composer-attachments flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="juno-composer-attachment flex items-center gap-1.5 text-xs group">
                  {file.file_type === 'image' ? (
                    <ImageIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate max-w-[120px]">{file.filename}</span>
                  <button onClick={() => removeFile(index)} className="juno-attachment-remove">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={localInput}
            onChange={(e) => {
              const val = e.target.value
              setLocalInput(val)
              inputValueRef.current = val
              // Sync to store without causing re-renders in other components
              useChatStore.setState({ inputValue: val })
            }}
            onKeyDown={handleKeyDown}
            placeholder="向 Juno 描述任务..."
            rows={2}
            className="juno-composer-textarea w-full bg-transparent resize-none focus:outline-none"
            style={{ height: "auto", overflow: "hidden" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = Math.min(target.scrollHeight, 132) + "px"
            }}
            disabled={isStreaming}
          />
        </div>

        <div className="juno-composer-toolbar flex items-center justify-between">
          <div className="juno-composer-left-tools flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="juno-composer-permission-trigger"
                  data-mode={agentApprovalMode}
                  aria-label={`Agent 权限：${selectedApprovalOption.label}`}
                >
                  <SelectedApprovalIcon className="h-3.5 w-3.5" />
                  <span>{selectedApprovalOption.shortLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" sideOffset={10} className="juno-agent-permission-menu w-[340px] p-1.5">
                <div className="px-2 pb-2 pt-1.5">
                  <div className="text-[12px] font-semibold text-foreground">Agent 权限</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">控制 Juno Agent 对当前工作区的操作范围</div>
                </div>
                {AGENT_APPROVAL_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const active = option.value === agentApprovalMode
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      className={`juno-agent-permission-item ${active ? "is-active" : ""}`}
                      onSelect={() => setAgentApprovalMode(option.value)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium">{option.label}</span>
                        <span className="juno-agent-permission-desc block">{option.description}</span>
                      </span>
                      {active && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isStreaming || isUploading}
                  className="juno-composer-tool-button"
                >
                  {isUploading ? (
                    <div className="h-4 w-4 animate-spin border-2 border-muted-foreground border-t-transparent rounded-full" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>上传文件 (图片/PDF)</TooltipContent>
            </Tooltip>
            {profileSupportsImage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (!currentAssistant) return
                      const next = imageGenEnabled ? 0 : 1
                      // 立即更新本地状态
                      setAssistants(assistants.map((a) => a.id === currentAssistant.id ? { ...a, image_generation_enabled: next } : a))
                      // 后台同步到后端
                      const a = currentAssistant
                      assistantAPI.update({
                        id: a.id, name: a.name, avatar_url: a.avatar_url || '',
                        description: a.description, system_prompt: a.system_prompt,
                        default_model_id: a.default_model_id || undefined,
                        assistant_model_profile_id: a.assistant_model_profile_id || undefined,
                        mcp_servers: (a.mcp_servers || []).map((m) => ({ id: m.id })),
                        knowledge_sources: (a.knowledge_sources || []).map((k) => ({ id: k.id })),
                        sample_questions: a.sample_questions || [],
                        history_rounds: a.history_rounds,
                        group_id: a.group_id || 0,
                        image_generation_enabled: next,
                      }).catch(() => {
                        // 失败时回滚
                        setAssistants(assistants.map((x) => x.id === a.id ? { ...x, image_generation_enabled: imageGenEnabled ? 1 : 0 } : x))
                      })
                    }}
                    disabled={isStreaming}
                    className={cn(
                      "juno-composer-tool-button",
                      imageGenEnabled
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    )}
                  >
                    {imageGenEnabled ? <ImageIcon className="h-4 w-4" /> : <ImageOff className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{imageGenEnabled ? '图片生成已开启' : '图片生成已禁用'}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="juno-composer-right-tools flex items-center">
            {isStreaming ? (
              <Button size="icon" variant="destructive" onClick={onStop} className="juno-composer-send shrink-0">
                <Square className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={onSend}
                disabled={(!localInput.trim() && uploadedFiles.length === 0) || !currentAssistantId}
                className={cn(
                  "juno-composer-send shrink-0 transition-colors",
                  (localInput.trim() || uploadedFiles.length > 0) && currentAssistantId ? "juno-send-button" : ""
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
