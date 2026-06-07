'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTabStore } from '@/lib/stores'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  const router = useRouter()
  const { closeTab } = useTabStore()

  useEffect(() => {
    const path = window.location.pathname
    const next = closeTab(path)
    router.replace(next)
  }, [])

  return null
}
