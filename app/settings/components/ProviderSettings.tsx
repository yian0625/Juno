"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Copy,
  Cpu,
  Database,
  Eye,
  EyeOff,
  ImageIcon,
  KeyRound,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  PencilLine,
  Play,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { junoHubAPIKeyAPI, providerAPI, searchProviderAPI } from "@/lib/api"
import type {
  AssistantModelProfile,
  JunoHubAPIKey,
  JunoHubAPIKeyCreateResp,
  JunoHubAPIKeyVerifyResp,
  JunoHubDocs,
  JunoHubDocsAbility,
  RagModelProfile,
  SearchProvider,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { SettingContainer } from "./SettingUI"

type CategoryValue = "all" | "chat" | "image" | "video" | "tts" | "stt" | "search" | "embedding"
type ServiceKind = "assistant" | "embedding" | "search" | "image" | "video" | "tts" | "stt"
type EditingKeyField = "name" | "description"

interface ServiceProfile {
  id: string
  name: string
  providerType: string
  iconUrl: string
  primaryAlias: string
  supportsImage: boolean
  kind: ServiceKind
  categoryValue: CategoryValue
  description?: string
}

const CATEGORIES: { value: CategoryValue; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "chat", label: "AI 对话" },
  { value: "image", label: "图像生成" },
  { value: "video", label: "视频生成" },
  { value: "tts", label: "文字转语音" },
  { value: "stt", label: "语音转文字" },
  { value: "search", label: "搜索与读取" },
  { value: "embedding", label: "文本向量化" },
]

function matchesCategory(profile: ServiceProfile, category: CategoryValue) {
  if (category === "all") return true
  if (category === "chat") return profile.kind === "assistant"
  if (category === "image") return profile.supportsImage
  if (category === "search") return profile.kind === "search"
  if (category === "embedding") return profile.kind === "embedding"
  if (category === "video" || category === "tts" || category === "stt") return profile.categoryValue === category
  return false
}

function providerInitial(providerType: string) {
  return (providerType || "J").trim().charAt(0).toUpperCase()
}

function categoryValueFromAbilityGroup(group: string): CategoryValue {
  if (group === "图像生成") return "image"
  if (group === "视频生成") return "video"
  if (group === "文字转语音") return "tts"
  if (group === "语音转文字") return "stt"
  if (group === "搜索与读取") return "search"
  if (group === "文本向量化") return "embedding"
  return "chat"
}

function serviceKindFromCategory(category: CategoryValue): ServiceKind {
  if (category === "embedding") return "embedding"
  if (category === "search") return "search"
  if (category === "image") return "image"
  if (category === "video") return "video"
  if (category === "tts") return "tts"
  if (category === "stt") return "stt"
  return "assistant"
}

function endpointForAbility(baseURL: string, ability?: JunoHubDocsAbility) {
  if (!ability) return baseURL
  const base = (baseURL || "http://127.0.0.1:9003/v1").replace(/\/$/, "")
  const path = ability.path.startsWith("/v1") ? ability.path.slice(3) : ability.path
  return `${base}${path}`
}

function defaultHubRequestBody(ability?: JunoHubDocsAbility) {
  const model = (ability?.model_alias || ability?.model || "").trim()
  if (!ability || !model) return ""
  const path = ability?.path || "/v1/chat/completions"
  if (path.includes("/embeddings")) {
    return JSON.stringify({
      model,
      input: "",
    }, null, 2)
  }
  if (path.includes("/images/")) {
    return JSON.stringify({
      model,
      prompt: "",
      size: "1024x1024",
      n: 1,
    }, null, 2)
  }
  if (path.includes("/audio/speech")) {
    return JSON.stringify({
      model,
      input: "",
      voice: "alloy",
    }, null, 2)
  }
  if (path.includes("/audio/transcriptions")) {
    return ""
  }
  if (path.includes("/responses")) {
    return JSON.stringify({
      model,
      input: "",
    }, null, 2)
  }
  return JSON.stringify({
    model,
    messages: [
      { role: "user", content: "" },
    ],
    stream: false,
  }, null, 2)
}

function abilityNeedsMultipart(ability?: JunoHubDocsAbility) {
  return Boolean(ability?.path?.includes("/audio/transcriptions"))
}

function hubRequestHasInput(ability: JunoHubDocsAbility | undefined, body: string) {
  if (!ability || !body.trim() || abilityNeedsMultipart(ability)) return false
  let payload: any
  try {
    payload = JSON.parse(body)
  } catch {
    return false
  }
  const path = ability.path || ""
  if (path.includes("/embeddings")) {
    return Array.isArray(payload.input)
      ? payload.input.some((item: unknown) => String(item || "").trim())
      : String(payload.input || "").trim() !== ""
  }
  if (path.includes("/images/")) return String(payload.prompt || "").trim() !== ""
  if (path.includes("/audio/speech")) return String(payload.input || "").trim() !== ""
  if (path.includes("/responses")) return String(payload.input || payload.instructions || "").trim() !== ""
  return Array.isArray(payload.messages) && payload.messages.some((message: any) => String(message?.content || "").trim())
}

function buildCurlCommand(baseURL: string, ability: JunoHubDocsAbility | undefined, key: string, body: string) {
  if (!ability || !key || !body.trim() || abilityNeedsMultipart(ability)) return ""
  const endpoint = endpointForAbility(baseURL, ability)
  const safeBody = body.trim().replace(/'/g, "'\"'\"'")
  return [
    `curl ${endpoint} \\`,
    `  -H "Authorization: Bearer ${key}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${safeBody}'`,
  ].join("\n")
}

function formatHubResponseBody(text: string) {
  if (!text) return ""
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

function displayValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}

async function copyText(text: string, title = "已复制") {
  try {
    await navigator.clipboard.writeText(text)
    toast({ title })
  } catch (err: any) {
    toast({ title: "复制失败", description: err.message })
  }
}

function formatUnixTime(value: number) {
  if (!value) return "-"
  return new Date(value * 1000).toLocaleString()
}

function displayJunoHubKeyName(key: JunoHubAPIKey) {
  const name = (key.name || "").trim()
  if (!name || name === "由 API Hub 自动创建") return "Juno Hub 自动创建"
  return name
}

function isProtectedJunoHubKey(key: JunoHubAPIKey) {
  return Boolean(
    key.protected ||
    key.metadata?.protected === "true" ||
    key.metadata?.default_key === "true" ||
    ((key.name === "Juno Hub 自动创建" || key.name === "由 API Hub 自动创建") && key.metadata?.source === "juno-app"),
  )
}

export default function ProviderSettings() {
  const [assistantProfiles, setAssistantProfiles] = useState<AssistantModelProfile[]>([])
  const [ragProfiles, setRagProfiles] = useState<RagModelProfile[]>([])
  const [searchProviders, setSearchProviders] = useState<SearchProvider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [activeCategory, setActiveCategory] = useState<CategoryValue>("all")

  const [docsOpen, setDocsOpen] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)
  const [hubDocs, setHubDocs] = useState<JunoHubDocs | null>(null)
  const [docsLoading, setDocsLoading] = useState(false)
  const [docCategoryIndex, setDocCategoryIndex] = useState(0)
  const [docAbilityIndex, setDocAbilityIndex] = useState(0)

  const [apiKeys, setApiKeys] = useState<JunoHubAPIKey[]>([])
  const [keysLoading, setKeysLoading] = useState(false)
  const [creatingKey, setCreatingKey] = useState(false)
  const [createdKey, setCreatedKey] = useState<JunoHubAPIKeyCreateResp | null>(null)
  const [autoKeyEnsured, setAutoKeyEnsured] = useState(false)
  const [verifyingKey, setVerifyingKey] = useState(false)
  const [verifyResult, setVerifyResult] = useState<JunoHubAPIKeyVerifyResp | null>(null)
  const [verifyKeyId, setVerifyKeyId] = useState<number | null>(null)
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<number, boolean>>({})
  const [hubRequestBody, setHubRequestBody] = useState("")
  const [hubRequestRunning, setHubRequestRunning] = useState(false)
  const [hubResponseStatus, setHubResponseStatus] = useState<number | null>(null)
  const [hubResponseBody, setHubResponseBody] = useState("")
  const [keyName, setKeyName] = useState("")
  const [keyDescription, setKeyDescription] = useState("")
  const [editingKey, setEditingKey] = useState<{ id: number; field: EditingKeyField } | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingDescription, setEditingDescription] = useState("")
  const skipInlineSaveRef = useRef(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    setIsLoading(true)
    try {
      const [assistantResult, ragResult, searchResult] = await Promise.all([
        providerAPI.listAssistantModelProfiles(),
        providerAPI.listRagModelProfiles(),
        searchProviderAPI.list(),
      ])
      setAssistantProfiles(assistantResult.list || [])
      setRagProfiles(ragResult.list || [])
      setSearchProviders(searchResult.list || [])
    } catch (err: any) {
      toast({ title: "加载模型方案失败", description: err.message })
    } finally {
      setIsLoading(false)
    }

    try {
      const docs = await junoHubAPIKeyAPI.docs()
      setHubDocs(docs)
    } catch {
      setHubDocs(null)
    }
  }

  const loadJunoHubKeys = useCallback(async (autoCreate = false) => {
    setKeysLoading(true)
    try {
      const result = await junoHubAPIKeyAPI.list(1, 50)
      let list = result.list || []
      if (autoCreate && !autoKeyEnsured && list.length === 0) {
        setCreatingKey(true)
        const created = await junoHubAPIKeyAPI.create({
          name: "Juno Hub 自动创建",
          description: "",
        })
        setCreatedKey(created)
        setVisibleKeyIds(prev => ({ ...prev, [created.id]: false }))
        setVerifyResult(null)
        setVerifyKeyId(null)
        setAutoKeyEnsured(true)
        list = [created]
      } else if (autoCreate) {
        setAutoKeyEnsured(true)
      }
      setApiKeys(list)
    } catch (err: any) {
      toast({ title: "加载 API Key 失败", description: err.message })
    } finally {
      setCreatingKey(false)
      setKeysLoading(false)
    }
  }, [autoKeyEnsured])

  const loadJunoHubDocs = useCallback(async () => {
    setDocsLoading(true)
    try {
      const result = await junoHubAPIKeyAPI.docs()
      setHubDocs(result)
      setDocCategoryIndex(0)
      setDocAbilityIndex(0)
    } catch (err: any) {
      toast({ title: "加载对接文档失败", description: err.message })
    } finally {
      setDocsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (keysOpen) {
      loadJunoHubKeys(true)
      if (!hubDocs) {
        loadJunoHubDocs()
      }
    }
  }, [keysOpen, hubDocs, loadJunoHubDocs, loadJunoHubKeys])

  useEffect(() => {
    if (docsOpen) {
      loadJunoHubDocs()
      loadJunoHubKeys()
    }
  }, [docsOpen, loadJunoHubDocs, loadJunoHubKeys])

  const profiles = useMemo<ServiceProfile[]>(() => [
    ...assistantProfiles.map(profile => ({
      id: `assistant-${profile.id}`,
      name: profile.name,
      providerType: profile.provider_type || "Juno",
      iconUrl: profile.chat_model_icon_url,
      primaryAlias: profile.chat_model_alias || "默认聊天模型",
      supportsImage: profile.image_generation_enabled === 1,
      kind: "assistant" as const,
      categoryValue: "chat" as const,
    })),
    ...ragProfiles.map(profile => ({
      id: `embedding-${profile.id}`,
      name: profile.name,
      providerType: "Embedding",
      iconUrl: "",
      primaryAlias: profile.embedding_model_alias || "Embedding 模型",
      supportsImage: false,
      kind: "embedding" as const,
      categoryValue: "embedding" as const,
    })),
    ...searchProviders.map(provider => ({
      id: `search-${provider.id}`,
      name: provider.name,
      providerType: provider.provider_type || "Search",
      iconUrl: provider.icon_url,
      primaryAlias: "搜索与读取服务",
      supportsImage: false,
      kind: "search" as const,
      categoryValue: "search" as const,
    })),
    ...(hubDocs?.categories || []).flatMap(category => (
      (category.list || []).map(ability => {
        const categoryValue = categoryValueFromAbilityGroup(category.ability_group)
        return {
          id: `hub-${category.ability_group}-${ability.path}-${ability.model_alias || ability.model}`,
          name: ability.ability_name || ability.model_alias || ability.model,
          providerType: "Juno Hub",
          iconUrl: "",
          primaryAlias: ability.model_alias || ability.model || ability.path,
          supportsImage: categoryValue === "image",
          kind: serviceKindFromCategory(categoryValue),
          categoryValue,
          description: ability.description,
        }
      })
    )),
  ], [assistantProfiles, hubDocs, ragProfiles, searchProviders])

  const filteredProfiles = useMemo(() => {
    return profiles.filter(profile => matchesCategory(profile, activeCategory))
  }, [activeCategory, profiles])

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceProfile[]>()
    for (const p of filteredProfiles) {
      const key = p.providerType || "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredProfiles])

  const activeKey = useMemo(() => apiKeys.find(key => key.status === 1) || null, [apiKeys])
  const docsCategories = hubDocs?.categories || []
  const docsBusy = docsLoading || keysLoading
  const docsNeedsKey = !keysLoading && !activeKey
  const selectedCategory = docsCategories[Math.min(docCategoryIndex, Math.max(docsCategories.length - 1, 0))]
  const selectedAbility = selectedCategory?.list?.[Math.min(docAbilityIndex, Math.max((selectedCategory?.list?.length || 1) - 1, 0))]
  const hubBaseURL = hubDocs?.base_url || "http://127.0.0.1:9003/v1"
  const fullActiveKey = createdKey?.key || activeKey?.key || ""
  const activeKeyMask = activeKey?.key_masked || createdKey?.key_masked || ""
  const requestBodyReady = hubRequestHasInput(selectedAbility, hubRequestBody)
  const curlCommand = requestBodyReady ? buildCurlCommand(hubBaseURL, selectedAbility, fullActiveKey, hubRequestBody) : ""
  const canRunHubRequest = Boolean(selectedAbility && fullActiveKey && requestBodyReady && !abilityNeedsMultipart(selectedAbility))

  useEffect(() => {
    setHubRequestBody(defaultHubRequestBody(selectedAbility))
    setHubResponseStatus(null)
    setHubResponseBody("")
  }, [selectedAbility?.deployment_id, selectedAbility?.path, selectedAbility?.model, selectedAbility?.model_alias])

  const createAPIKey = async () => {
    setCreatingKey(true)
    try {
      const result = await junoHubAPIKeyAPI.create({
        name: keyName.trim() || "Juno Hub 自动创建",
        description: keyDescription.trim(),
      })
      setCreatedKey(result)
      setVerifyResult(null)
      setVerifyKeyId(null)
      setVisibleKeyIds(prev => ({ ...prev, [result.id]: true }))
      setAutoKeyEnsured(true)
      setKeyName("")
      setKeyDescription("")
      await loadJunoHubKeys()
      toast({ title: "API Key 已生成" })
    } catch (err: any) {
      toast({ title: "生成 API Key 失败", description: err.message })
    } finally {
      setCreatingKey(false)
    }
  }

  const verifyAPIKey = async (key?: JunoHubAPIKey) => {
    if (!createdKey?.key && !key?.key && !key?.id) {
      toast({ title: "没有可验证的 API Key" })
      return
    }
    setVerifyingKey(true)
    try {
      const fullKey = key?.key || (createdKey?.key && (!key || key.id === createdKey.id) ? createdKey.key : "")
      const payload = fullKey
        ? { key: fullKey }
        : { id: key?.id }
      const result = await junoHubAPIKeyAPI.verify(payload)
      setVerifyResult(result)
      setVerifyKeyId(key?.id || createdKey?.id || null)
      toast({ title: result.ok ? "Juno Hub 连接成功" : "Juno Hub 连接失败", description: result.message })
      await loadJunoHubKeys()
    } catch (err: any) {
      toast({ title: "验证连接失败", description: err.message })
    } finally {
      setVerifyingKey(false)
    }
  }

  const toggleAPIKeyStatus = async (key: JunoHubAPIKey) => {
    const nextStatus = key.status === 1 ? 0 : 1
    try {
      const updated = await junoHubAPIKeyAPI.update({ id: key.id, status: nextStatus })
      setApiKeys(prev => prev.map(item => item.id === key.id ? updated : item))
      toast({ title: nextStatus === 1 ? "API Key 已启用" : "API Key 已停用" })
    } catch (err: any) {
      toast({ title: "更新 API Key 失败", description: err.message })
    }
  }

  const deleteAPIKey = async (key: JunoHubAPIKey) => {
    if (isProtectedJunoHubKey(key)) {
      toast({ title: "默认 Juno Hub Key 不能删除" })
      return
    }
    if (!window.confirm(`删除 API Key「${displayJunoHubKeyName(key)}」？删除后无法恢复。`)) return
    try {
      await junoHubAPIKeyAPI.delete(key.id)
      setApiKeys(prev => prev.filter(item => item.id !== key.id))
      if (createdKey?.id === key.id) setCreatedKey(null)
      setVisibleKeyIds(prev => {
        const next = { ...prev }
        delete next[key.id]
        return next
      })
      if (verifyKeyId === key.id) {
        setVerifyResult(null)
        setVerifyKeyId(null)
      }
      toast({ title: "API Key 已删除" })
    } catch (err: any) {
      toast({ title: "删除 API Key 失败", description: err.message })
    }
  }

  const startEditAPIKey = (key: JunoHubAPIKey, field: EditingKeyField) => {
    setEditingKey({ id: key.id, field })
    setEditingName(displayJunoHubKeyName(key))
    setEditingDescription(key.description || "")
  }

  const cancelAPIKeyEdit = () => {
    setEditingKey(null)
    setEditingName("")
    setEditingDescription("")
  }

  const cancelInlineAPIKeyEdit = () => {
    skipInlineSaveRef.current = true
    cancelAPIKeyEdit()
  }

  const handleAPIKeyEditBlur = (key: JunoHubAPIKey, field: EditingKeyField) => {
    if (skipInlineSaveRef.current) {
      skipInlineSaveRef.current = false
      return
    }
    saveAPIKeyEdit(key, field)
  }

  const saveAPIKeyEdit = async (key: JunoHubAPIKey, field: EditingKeyField) => {
    const payload: { id: number; name?: string; description?: string } = { id: key.id }
    if (field === "name") {
      const name = editingName.trim()
      if (!name) {
        setEditingName(key.name)
        cancelAPIKeyEdit()
        toast({ title: "名称不能为空" })
        return
      }
      if (name === key.name) {
        cancelAPIKeyEdit()
        return
      }
      payload.name = name
    } else {
      const description = editingDescription.trim()
      if (description === (key.description || "")) {
        cancelAPIKeyEdit()
        return
      }
      payload.description = description
    }

    try {
      const updated = await junoHubAPIKeyAPI.update(payload)
      setApiKeys(prev => prev.map(item => item.id === key.id ? updated : item))
      setEditingKey(current => (
        current?.id === key.id && current.field === field ? null : current
      ))
      toast({ title: "API Key 已更新" })
    } catch (err: any) {
      toast({ title: "更新 API Key 失败", description: err.message })
    }
  }

  const runHubRequest = async () => {
    if (!selectedAbility) {
      toast({ title: "没有可调用的部署" })
      return
    }
    if (abilityNeedsMultipart(selectedAbility)) {
      toast({ title: "该端点需要文件上传", description: "请使用客户端按 multipart/form-data 调用。" })
      return
    }
    if (!fullActiveKey) {
      toast({ title: "没有可用的完整 API Key" })
      return
    }
    const body = hubRequestBody.trim()
    if (!body) {
      toast({ title: "请求体不能为空" })
      return
    }
    try {
      JSON.parse(body)
    } catch (err: any) {
      toast({ title: "请求体不是合法 JSON", description: err.message })
      return
    }
    if (!hubRequestHasInput(selectedAbility, body)) {
      toast({ title: "请填写真实请求内容" })
      return
    }

    setHubRequestRunning(true)
    setHubResponseStatus(null)
    setHubResponseBody("")
    try {
      const res = await fetch(endpointForAbility(hubBaseURL, selectedAbility), {
        method: selectedAbility.method || "POST",
        headers: {
          Authorization: `Bearer ${fullActiveKey}`,
          "Content-Type": "application/json",
        },
        body,
      })
      const text = await res.text()
      setHubResponseStatus(res.status)
      setHubResponseBody(formatHubResponseBody(text))
      toast({ title: res.ok ? "真实调用成功" : "真实调用失败", description: `HTTP ${res.status}` })
    } catch (err: any) {
      setHubResponseBody(err.message || String(err))
      toast({ title: "真实调用失败", description: err.message })
    } finally {
      setHubRequestRunning(false)
    }
  }

  return (
    <SettingContainer>
      <div className="border-b border-border/50 pb-5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground">Juno Hub</h1>
            <p className="mt-1.5 max-w-[580px] text-[13px] leading-5 text-muted-foreground">
              由 Juno 提供，多服务商模型可供选择。
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDocsOpen(true)}
              className="h-8 rounded-lg border-border/70 bg-background/85 px-3 text-[13px] font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <BookOpen className="h-4 w-4" />
              <span>对接文档</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setKeysOpen(true)}
              className="h-8 rounded-lg border-border/70 bg-background/85 px-3 text-[13px] font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <KeyRound className="h-4 w-4" />
              <span>我的 API Key</span>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {CATEGORIES.map(category => {
            const active = activeCategory === category.value
            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setActiveCategory(category.value)}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-semibold transition-all",
                  active
                    ? "bg-foreground text-background shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
                    : "bg-foreground/[0.045] text-muted-foreground hover:bg-foreground/[0.075] hover:text-foreground",
                )}
              >
                <span>{category.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 rounded-xl border border-border/50 bg-background/80 p-8 shadow-sm">
          <div className="flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="mt-6 flex h-28 items-center justify-center rounded-xl border border-border/50 bg-background/80 text-center text-[13px] text-muted-foreground shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground/60" />
            <span>暂无可用模型</span>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {grouped.map(([providerType, items]) => {
            const isCollapsed = collapsed[providerType] ?? false
            return (
              <section key={providerType}>
                <button
                  onClick={() => setCollapsed(prev => ({ ...prev, [providerType]: !prev[providerType] }))}
                  className="flex w-full cursor-pointer select-none items-center gap-2 text-left"
                >
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{providerType}</span>
                  <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{items.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {items.map((p) => (
                      <ProfileCard key={p.id} profile={p} />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      <Sheet open={keysOpen} onOpenChange={setKeysOpen}>
        <SheetContent
          side="right"
          className="!w-[min(480px,calc(100vw-1.25rem))] !max-w-none gap-0 overflow-hidden border-l border-black/10 bg-background p-0 shadow-[0_24px_64px_rgba(0,0,0,0.20)] dark:border-white/10"
        >
          <SheetHeader className="shrink-0 border-b border-border/60 px-5 py-4 pr-11 text-left sm:px-6">
            <SheetTitle className="text-[20px] font-semibold leading-6 tracking-normal text-foreground">
              我的 API Key
            </SheetTitle>
            <SheetDescription className="mt-1 max-w-[400px] text-[12px] leading-5 text-muted-foreground">
              查看、修改名称与备注、启用或禁用你创建过的 Key。
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="rounded-[13px] border border-border/70 bg-foreground/[0.025] p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-muted-foreground">Base URL 地址</div>
                  <div className="mt-1.5 break-all font-mono text-[15px] leading-6 text-foreground sm:text-[16px]">
                    {hubBaseURL}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-[9px] border border-border/70 bg-background text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:text-foreground focus-visible:ring-0"
                  onClick={() => copyText(hubBaseURL, "Base URL 已复制")}
                  title="复制 Base URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="my-3 h-px bg-border/70" />
              <div className="text-[11px] leading-4 text-muted-foreground">API Key 使用方式：Header 携带</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <code className="rounded-[8px] border border-border/60 bg-background px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                  X-API-Key: {"{YOUR_API_KEY}"}
                </code>
                <code className="rounded-[8px] border border-border/60 bg-background px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                  Authorization: Bearer {"{YOUR_API_KEY}"}
                </code>
              </div>
            </div>

            <div className="mt-5 mb-2.5 flex items-center gap-3">
              <div className="text-[11px] font-semibold text-muted-foreground">密钥</div>
            </div>

            {keysLoading ? (
              <div className="mt-5 flex h-28 items-center justify-center rounded-[13px] border border-border/60 bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="mt-5 flex h-28 flex-col items-center justify-center gap-2.5 rounded-[13px] border border-border/60 bg-background/70 text-[12px] text-muted-foreground">
                <span>还没有 API Key</span>
                <Button type="button" onClick={createAPIKey} disabled={creatingKey || keysLoading} className="h-7 rounded-[8px] px-2.5 text-[11px]">
                  {creatingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>生成 API Key</span>
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {apiKeys.map(key => {
                  const isEditingName = editingKey?.id === key.id && editingKey.field === "name"
                  const isEditingDescription = editingKey?.id === key.id && editingKey.field === "description"
                  const fullKey = key.key || (createdKey?.id === key.id ? createdKey.key : "")
                  const canReveal = fullKey !== ""
                  const keyVisible = canReveal && Boolean(visibleKeyIds[key.id])
                  const keyDisplay = keyVisible ? fullKey : key.key_masked
                  const protectedKey = isProtectedJunoHubKey(key)
                  return (
                    <div
                      key={key.id}
                      className="rounded-[13px] border border-primary/14 bg-primary/[0.04] p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:bg-primary/[0.10]"
                    >
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {isEditingName ? (
                              <Input
                                autoFocus
                                value={editingName}
                                onChange={event => setEditingName(event.target.value)}
                                onBlur={() => handleAPIKeyEditBlur(key, "name")}
                                onKeyDown={event => {
                                  if (event.key === "Enter") {
                                    event.preventDefault()
                                    event.currentTarget.blur()
                                  }
                                  if (event.key === "Escape") cancelInlineAPIKeyEdit()
                                }}
                                className="h-7 max-w-[260px] rounded-[8px] border-border/70 bg-background px-2.5 text-[14px] font-semibold leading-5"
                                placeholder="Key 名称"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditAPIKey(key, "name")}
                                className="group flex max-w-full items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-0"
                                title="编辑名称"
                              >
                                <span className="truncate text-[15px] font-semibold leading-5 text-foreground">
                                  {displayJunoHubKeyName(key)}
                                </span>
                                <PencilLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground/75 transition-colors group-hover:text-foreground" />
                              </button>
                            )}
                            {isEditingDescription ? (
                              <Input
                                autoFocus
                                value={editingDescription}
                                onChange={event => setEditingDescription(event.target.value)}
                                onBlur={() => handleAPIKeyEditBlur(key, "description")}
                                onKeyDown={event => {
                                  if (event.key === "Enter") {
                                    event.preventDefault()
                                    event.currentTarget.blur()
                                  }
                                  if (event.key === "Escape") cancelInlineAPIKeyEdit()
                                }}
                                className="mt-1 h-7 rounded-[8px] border-border/70 bg-background px-2.5 text-[12px] text-muted-foreground"
                                placeholder="备注，可选"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditAPIKey(key, "description")}
                                className="group mt-0.5 flex max-w-full items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-0"
                                title="编辑备注"
                              >
                                <span className="truncate text-[12px] italic leading-5 text-muted-foreground">
                                  {key.description || "（无备注）"}
                                </span>
                                <PencilLine className="h-3 w-3 shrink-0 text-muted-foreground/55 opacity-0 transition-opacity group-hover:opacity-100" />
                              </button>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-[8px] text-muted-foreground focus-visible:ring-0">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => verifyAPIKey(key)} disabled={verifyingKey}>检查连接</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleAPIKeyStatus(key)}>
                                {key.status === 1 ? "禁用" : "启用"}
                              </DropdownMenuItem>
                              {!protectedKey && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onClick={() => deleteAPIKey(key)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span>删除</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                          <div className="mt-3 flex min-h-[42px] items-center gap-1 rounded-[10px] border border-border/60 bg-background/85 px-3 py-2">
                            <code className="min-w-0 flex-1 truncate font-mono text-[13px] leading-5 text-foreground sm:text-[14px]">
                              {keyDisplay}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 rounded-[8px] text-muted-foreground focus-visible:ring-0"
                              onClick={() => setVisibleKeyIds(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                              disabled={!canReveal}
                              title={canReveal ? "显示或隐藏完整 Key" : "旧版 Key 无法恢复完整值"}
                            >
                              {keyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 rounded-[8px] text-muted-foreground focus-visible:ring-0"
                              onClick={() => copyText(fullKey, "API Key 已复制")}
                              disabled={!canReveal}
                              title={canReveal ? "复制完整 Key" : "旧版 Key 无法恢复完整值"}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {verifyResult && verifyKeyId === key.id && (
                            <div
                              className={cn(
                                "mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                                verifyResult.ok
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "bg-destructive/10 text-destructive",
                              )}
                            >
                              {verifyResult.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                              <span className="truncate">
                                {verifyResult.message}{verifyResult.ok ? ` · ${verifyResult.model_count} 个模型` : ""}
                              </span>
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="min-w-0 text-[11px] text-muted-foreground">{formatUnixTime(key.create_time)}</div>
                            <span
                              className={cn(
                                "shrink-0 rounded-[8px] px-2 py-0.5 text-[11px] font-semibold",
                                key.status === 1 ? "bg-primary/10 text-primary" : "bg-foreground/[0.06] text-muted-foreground",
                              )}
                            >
                              {key.status === 1 ? "可用" : "已停用"}
                            </span>
                          </div>
                      </>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={docsOpen} onOpenChange={setDocsOpen}>
        <SheetContent side="right" className="!w-[min(1080px,calc(100vw-2rem))] !max-w-none gap-0 overflow-hidden bg-popover p-0">
          <SheetHeader className="border-b border-border/60 px-6 py-5">
            <SheetTitle className="text-[18px]">对接文档</SheetTitle>
            <SheetDescription className="text-[13px]">
              使用你的真实 API Key 与 Base URL 调用 Juno Hub 已通过健康检查的部署。
            </SheetDescription>
          </SheetHeader>
          {docsBusy ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : docsNeedsKey ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <div className="flex min-h-[360px] w-full max-w-3xl items-center justify-center rounded-xl border border-border/60 bg-background/80 p-8 text-center">
                <div className="max-w-sm">
                  <KeyRound className="mx-auto h-8 w-8 text-muted-foreground/70" />
                  <div className="mt-4 text-[15px] font-semibold text-foreground">请先生成一把 Key</div>
                  <p className="mt-2 text-[13px] leading-5 text-muted-foreground">对接文档需要配合你的 API Key 使用。</p>
                  <Button type="button" className="mt-5 h-8 rounded-lg px-3 text-[13px]" onClick={() => { setDocsOpen(false); setKeysOpen(true) }}>
                    <Plus className="h-4 w-4" />
                    <span>生成 API Key</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : docsCategories.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <div className="flex min-h-[360px] w-full max-w-3xl items-center justify-center rounded-xl border border-border/60 bg-background/80 p-8 text-center">
                <div className="max-w-sm">
                  <Database className="mx-auto h-8 w-8 text-muted-foreground/70" />
                  <div className="mt-4 text-[15px] font-semibold text-foreground">暂无可对接服务</div>
                  <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                    当前没有启用的 Juno Hub 部署。配置真实部署后，这里会按实际能力生成文档。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-foreground/[0.025] p-4 md:block">
                <div className="space-y-1">
                  {docsCategories.map((category, index) => (
                    <button
                      key={category.ability_group}
                      type="button"
                      onClick={() => {
                        setDocCategoryIndex(index)
                        setDocAbilityIndex(0)
                      }}
                      className={cn(
                        "flex h-9 w-full items-center justify-between rounded-lg px-3 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-0",
                        index === docCategoryIndex ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                      )}
                    >
                      <span>{category.ability_group}</span>
                      <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[10px]">{category.list?.length || 0}</span>
                    </button>
                  ))}
                </div>
              </aside>
              <div className="min-w-0 flex-1 overflow-y-auto p-6">
                {!selectedAbility ? (
                <div className="flex h-64 items-center justify-center text-[13px] text-muted-foreground">暂无文档</div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{selectedCategory?.ability_group}</div>
                        <h2 className="mt-2 text-[20px] font-semibold text-foreground">{selectedAbility.ability_name}</h2>
                        <p className="mt-2 text-[13px] leading-5 text-muted-foreground">{selectedAbility.description}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg px-3 text-[13px]"
                        onClick={() => copyText(curlCommand, "真实请求已复制")}
                        disabled={!curlCommand}
                      >
                        <Copy className="h-4 w-4" />
                        <span>复制请求</span>
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <InfoRow label="Base URL" value={hubDocs?.base_url || "http://127.0.0.1:9003/v1"} />
                      <InfoRow label="Endpoint" value={endpointForAbility(hubDocs?.base_url || "http://127.0.0.1:9003/v1", selectedAbility)} />
                      <InfoRow label="Method" value={selectedAbility.method || "POST"} />
                      <InfoRow label="Model" value={displayValue(selectedAbility.model_alias || selectedAbility.model)} />
                      <InfoRow label="Provider" value={displayValue(selectedAbility.provider_type)} />
                      <InfoRow label="Upstream" value={displayValue(selectedAbility.upstream_model)} />
                      <InfoRow label="Format" value={displayValue(selectedAbility.api_format)} />
                      <InfoRow label="Health" value={displayValue(selectedAbility.health_status)} />
                      <InfoRow label="Checked" value={formatUnixTime(selectedAbility.last_checked_at)} />
                    </div>
                  </div>

                  {hubDocs?.models?.length ? (
                    <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                      <div className="mb-3 text-[13px] font-semibold text-foreground">可用模型</div>
                      <div className="flex flex-wrap gap-2">
                        {hubDocs.models.map(model => (
                          <span key={model} className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[12px] text-muted-foreground">{model}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-background/80 p-4 text-[13px] leading-5 text-muted-foreground shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                      还没有可用模型部署。请在 Juno Hub 中配置部署后再调用。
                    </div>
                  )}

                  <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-foreground">请求控制台</div>
                        <div className="mt-1 text-[12px] text-muted-foreground">
                          {activeKeyMask ? `当前 Key：${activeKeyMask}` : "当前没有可恢复的完整 Key"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-[13px]"
                          onClick={() => copyText(curlCommand, "真实请求已复制")}
                          disabled={!curlCommand}
                        >
                          <Copy className="h-4 w-4" />
                          <span>复制请求</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-[13px]"
                          onClick={runHubRequest}
                          disabled={!canRunHubRequest || hubRequestRunning}
                        >
                          {hubRequestRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          <span>执行请求</span>
                        </Button>
                      </div>
                    </div>
                    {!fullActiveKey && (
                      <div className="mb-3 rounded-lg border border-border/50 bg-foreground/[0.025] px-3 py-2 text-[12px] leading-5 text-muted-foreground">
                        当前 Key 没有完整密文，重新生成后才能复制或执行真实请求。
                      </div>
                    )}
                    {abilityNeedsMultipart(selectedAbility) ? (
                      <div className="rounded-lg border border-border/50 bg-foreground/[0.025] px-3 py-3 text-[12px] leading-5 text-muted-foreground">
                        这个端点需要上传本地文件，控制台不会生成假的文件参数。
                      </div>
                    ) : (
                      <Textarea
                        value={hubRequestBody}
                        onChange={event => setHubRequestBody(event.target.value)}
                        className="min-h-[190px] resize-y rounded-lg border-border/60 bg-foreground/[0.035] font-mono text-[12px] leading-5 text-foreground"
                        spellCheck={false}
                      />
                    )}
                    {hubResponseStatus !== null && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-foreground">
                          <span>真实响应</span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[11px]",
                            hubResponseStatus >= 200 && hubResponseStatus < 300 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive",
                          )}>
                            HTTP {hubResponseStatus}
                          </span>
                        </div>
                        <pre className="max-h-[300px] overflow-auto rounded-lg bg-foreground/[0.045] p-4 text-[12px] leading-5 text-foreground"><code>{hubResponseBody}</code></pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SettingContainer>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-foreground/[0.035] px-3 py-2">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-[12px] font-medium text-foreground">{value}</div>
    </div>
  )
}

function ProfileCard({ profile }: { profile: ServiceProfile }) {
  const description = profile.description || (profile.kind === "embedding"
    ? `${profile.primaryAlias} 面向文本向量化，适合知识库检索和语义匹配`
    : profile.kind === "search"
      ? `${profile.primaryAlias} 面向联网搜索、网页读取和外部信息检索`
    : profile.kind === "image"
      ? `${profile.primaryAlias} 面向图像生成，适合视觉创作和图片任务`
    : profile.kind === "video"
      ? `${profile.primaryAlias} 面向视频生成，适合短片和动态内容`
    : profile.kind === "tts"
      ? `${profile.primaryAlias} 面向文字转语音，适合语音合成任务`
    : profile.kind === "stt"
      ? `${profile.primaryAlias} 面向语音转文字，适合转写任务`
    : profile.supportsImage
      ? `${profile.primaryAlias} 兼顾 AI 对话与图像生成，适合日常创作和多模态任务`
      : `${profile.primaryAlias} 面向 AI 对话，适合日常问答、写作和任务处理`)

  return (
    <div className="group flex min-h-[158px] cursor-default flex-col rounded-xl border border-border/60 bg-background/80 p-5 shadow-[0_1px_4px_rgba(15,23,42,0.045)] transition-all hover:-translate-y-0.5 hover:border-border hover:bg-background/95 hover:shadow-[0_12px_28px_rgba(15,23,42,0.075)]">
      <div className="flex items-start gap-3">
        {profile.iconUrl ? (
          <img src={profile.iconUrl} alt="" className="h-12 w-12 rounded-xl border border-border/60 bg-white object-contain p-1.5 shadow-sm dark:bg-black" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-foreground/[0.035] text-muted-foreground shadow-sm">
            {profile.kind === "embedding" ? <Database className="h-5 w-5" /> : profile.kind === "search" ? <Search className="h-5 w-5" /> : <Cpu className="h-5 w-5" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              {profile.providerType || "JUNO"}
            </span>
          </div>
          <h3 className="mt-3 truncate text-[15px] font-semibold leading-6 text-foreground">
            {profile.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
        {profile.kind === "embedding" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
            <Database className="h-3 w-3" />
            向量化
          </span>
        ) : profile.kind === "search" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            <Search className="h-3 w-3" />
            搜索
          </span>
        ) : profile.kind === "image" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <ImageIcon className="h-3 w-3" />
            生图
          </span>
        ) : profile.kind === "video" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Cpu className="h-3 w-3" />
            视频
          </span>
        ) : profile.kind === "tts" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Cpu className="h-3 w-3" />
            TTS
          </span>
        ) : profile.kind === "stt" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Cpu className="h-3 w-3" />
            STT
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
            <MessageCircle className="h-3 w-3" />
            聊天
          </span>
        )}
        {profile.supportsImage && profile.kind === "assistant" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <ImageIcon className="h-3 w-3" />
            生图
          </span>
        )}
        <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-foreground/[0.045] text-[11px] font-semibold text-muted-foreground">
          {providerInitial(profile.providerType)}
        </span>
      </div>
    </div>
  )
}
