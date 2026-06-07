export {}

declare global {
  interface Window {
    junoDesktop?: {
      kind?: string
      isDesktop?: boolean
      retry?: () => Promise<void>
      openUrl?: () => Promise<void>
      openLogs?: () => Promise<void>
      createFolder?: (name: string) => Promise<{
        canceled?: boolean
        path?: string
        name?: string
        error?: string
      }>
      chooseFolder?: () => Promise<{
        canceled?: boolean
        path?: string
        name?: string
        error?: string
      }>
    }
  }
}
