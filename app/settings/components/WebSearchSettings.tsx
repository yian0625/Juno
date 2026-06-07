"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"

export default function WebSearchSettings() {
  const {
    searchEnabled, setSearchEnabled,
    searchEngine, setSearchEngine,
    searchApiKey, setSearchApiKey,
    saveSetting,
  } = useSettingsStore()

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>网络搜索</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>启用网络搜索</SettingRowTitle>
          <Switch checked={searchEnabled} onCheckedChange={(c) => { setSearchEnabled(c); saveSetting("juno_websearch_enabled", String(c)) }} />
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>搜索引擎</SettingRowTitle>
          <Select value={searchEngine} onValueChange={(v) => { setSearchEngine(v); saveSetting("juno_websearch_engine", v) }}>
            <SelectTrigger className="h-9 text-[13px] w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="bing">Bing</SelectItem>
              <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
              <SelectItem value="searxng">SearXNG</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        {(searchEngine === "google" || searchEngine === "bing") && (
          <>
            <SettingDivider />
            <SettingRow className="flex-col items-start gap-1.5">
              <SettingRowTitle>搜索 API Key</SettingRowTitle>
              <Input
                type="password"
                value={searchApiKey}
                onChange={(e) => setSearchApiKey(e.target.value)}
                onBlur={() => saveSetting("juno_websearch_api_key", searchApiKey)}
                placeholder={searchEngine === "google" ? "Google Custom Search API Key" : "Bing Search API Key"}
                className="h-9 text-[13px] w-full"
              />
            </SettingRow>
          </>
        )}
      </SettingGroup>
    </SettingContainer>
  )
}
