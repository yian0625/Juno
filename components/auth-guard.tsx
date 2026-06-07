"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, getToken } from '@/lib/api'
import { TabBar } from '@/components/tab-bar'

const publicPaths = ['/login']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<'checking' | 'ok' | 'redirecting'>('checking')

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  useEffect(() => {
    if (isPublicPath) {
      setStatus('ok')
      return
    }

    const user = getUser()
    const token = getToken()

    if (user && token) {
      setStatus('ok')
      return
    }

    setStatus('redirecting')
    const target = '/login?redirect=' + encodeURIComponent(pathname)
    router.replace(target)

    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = target
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [pathname, router, isPublicPath])

  useEffect(() => {
    const handleMenuAction = (event: Event) => {
      const action = (event as CustomEvent<{ action?: string }>).detail?.action
      if (action === 'open-settings') {
        router.push('/settings')
      }
    }

    window.addEventListener('juno-menu-action', handleMenuAction)
    return () => window.removeEventListener('juno-menu-action', handleMenuAction)
  }, [router])

  if (status === 'ok') {
    // Public pages (login) don't get the TabBar
    if (isPublicPath) {
      return <>{children}</>
    }

    return (
      <div className="juno-app-shell flex h-[100dvh] min-h-0 flex-col overflow-hidden">
        <TabBar />
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  return null
}
