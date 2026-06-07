import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  sidebarTab: 'assistants' | 'topics'
  sidebarWidth: number
  searchOpen: boolean
  searchQuery: string
  assistantDialogOpen: boolean
  assistantIconType: 'model' | 'emoji' | 'none'
  assistantSortOrder: 'default' | 'pinyin-asc' | 'pinyin-desc'
  assistantListMode: 'list' | 'group'
  scrollToMessageId: string | null

  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarTab: (tab: 'assistants' | 'topics') => void
  setSidebarWidth: (width: number) => void
  setSearchOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setAssistantDialogOpen: (open: boolean) => void
  setAssistantIconType: (type: 'model' | 'emoji' | 'none') => void
  setAssistantSortOrder: (order: 'default' | 'pinyin-asc' | 'pinyin-desc') => void
  setAssistantListMode: (mode: 'list' | 'group') => void
  setScrollToMessageId: (id: string | null) => void
}

const SIDEBAR_WIDTH_KEY = 'juno-sidebar-width-v2'
const SIDEBAR_MIN_WIDTH = 220
const SIDEBAR_MAX_WIDTH = 320
const DEFAULT_SIDEBAR_WIDTH = 248

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarTab: 'topics',
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  searchOpen: false,
  searchQuery: '',
  assistantDialogOpen: false,
  assistantIconType: 'emoji',
  assistantSortOrder: 'default',
  assistantListMode: 'list',
  scrollToMessageId: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setSidebarWidth: (width) => {
    const clamped = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width))
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clamped))
    }
    set({ sidebarWidth: clamped })
  },
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setAssistantDialogOpen: (open) => set({ assistantDialogOpen: open }),
  setAssistantIconType: (type) => set({ assistantIconType: type }),
  setAssistantSortOrder: (order) => set({ assistantSortOrder: order }),
  setAssistantListMode: (mode) => set({ assistantListMode: mode }),
  setScrollToMessageId: (id) => set({ scrollToMessageId: id }),
}))
