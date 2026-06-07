import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Tab {
  path: string
  label: string
  closable: boolean
}

const FIXED_TABS: Tab[] = [
  { path: '/', label: '首页', closable: false },
]

interface TabState {
  tabs: Tab[]
  openTab: (path: string, label?: string) => void
  closeTab: (path: string) => string
  hasTab: (path: string) => boolean
  patchLabel: (path: string, label: string) => void
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [...FIXED_TABS],

      openTab: (path: string, label?: string) => {
        if (path === '/agents') return
        const { tabs } = get()
        const existing = tabs.find(t => t.path === path)
        if (existing) {
          // 如果有更好的 label（不是路径本身），更新它
          if (label && label !== path && existing.label === path) {
            set({ tabs: tabs.map(t => t.path === path ? { ...t, label } : t) })
          }
          return
        }
        set({ tabs: [...tabs, { path, label: label || path, closable: true }] })
      },

      closeTab: (path: string) => {
        const { tabs } = get()
        const idx = tabs.findIndex(t => t.path === path)
        if (idx === -1 || !tabs[idx].closable) return '/'
        const newTabs = tabs.filter(t => t.path !== path)
        set({ tabs: newTabs })
        if (idx > 0) return newTabs[idx - 1].path
        return newTabs[0]?.path || '/'
      },

      hasTab: (path: string) => get().tabs.some(t => t.path === path),

      // 只更新 label，不新增 tab
      patchLabel: (path: string, label: string) => {
        const { tabs } = get()
        const existing = tabs.find(t => t.path === path)
        if (!existing || existing.label === label) return
        set({ tabs: tabs.map(t => t.path === path ? { ...t, label } : t) })
      },
    }),
    {
      name: 'juno-tabs',
      storage: createJSONStorage(() => sessionStorage),
      // 恢复时确保固定 tab 始终存在
      merge: (persisted: any, current) => {
        const persistedTabs: Tab[] = persisted?.tabs || []
        const dynamicTabs = persistedTabs.filter(t => t.closable && t.path !== '/agents')
        return { ...current, tabs: [...FIXED_TABS, ...dynamicTabs] }
      },
    }
  )
)
