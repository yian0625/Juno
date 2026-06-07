"use client"

import { cn } from "@/lib/utils"

export function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-border/40 p-5 bg-background/80 dark:bg-white/[0.03] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {children}
    </div>
  )
}

export function SettingTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between select-none text-[13px] font-semibold tracking-wide text-foreground/90", className)}>
      {children}
    </div>
  )
}

export function SettingDivider() {
  return <div className="border-t border-border/30 my-3" />
}

export function SettingRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between min-h-[32px] py-0.5", className)}>
      {children}
    </div>
  )
}

export function SettingRowTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[13px] leading-[18px] text-foreground/80 flex items-center">{children}</div>
  )
}

export function SettingContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 overflow-y-auto p-5" style={{ background: "var(--color-background-soft, hsl(var(--accent)/0.3))" }}>
      {children}
    </div>
  )
}
