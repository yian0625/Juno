"use client"

import { SettingGroup, SettingTitle, SettingDivider, SettingRow, SettingRowTitle, SettingContainer } from "./SettingUI"

export default function AboutSettings() {
  return (
    <SettingContainer>
      <SettingGroup>
        <div className="flex flex-col items-center py-6 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">J</div>
          <div className="text-center">
            <h2 className="text-lg font-bold">Juno</h2>
            <p className="text-[12px] text-muted-foreground mt-1">v1.0.0</p>
          </div>
        </div>
      </SettingGroup>
      <SettingGroup>
        <SettingTitle>信息</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>版本</SettingRowTitle>
          <span className="text-[13px] text-muted-foreground">1.0.0</span>
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>作者</SettingRowTitle>
          <span className="text-[13px] text-muted-foreground">Juno Team</span>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}
