"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { getUser, getToken } from '@/lib/api'

// 公开路由（不需要登录）
const publicPaths = ['/login']

/**
 * 认证守卫组件
 * 在页面渲染前检查用户登录状态
 * - 未登录时立即重定向到登录页
 * - 已登录但访问登录页时重定向到首页或redirect参数指定的页面
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const user = getUser()
    const token = getToken()
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

    // 检查是否已登录（同步操作，立即执行）
    const authenticated = !!(user && token)
    
    // 如果在公开路径
    if (isPublicPath) {
      // 允许访问公开路径（登录页面自己会处理已登录用户的跳转）
      setIsAuthenticated(true)
      setIsChecking(false)
      return
    }

    // 如果在受保护的路径
    if (!authenticated) {
      // 未登录，立即重定向到登录页
      router.replace('/login?redirect=' + encodeURIComponent(pathname))
      return
    }

    // 已登录，允许访问（立即设置）
    setIsAuthenticated(true)
    setIsChecking(false)
  }, [pathname, searchParams, router])

  // 正在检查认证状态时，不显示加载屏幕（避免闪烁）
  // 直接返回 null，让检查在后台完成
  if (isChecking) {
    return null
  }

  // 认证通过，显示子组件
  if (isAuthenticated) {
    return <>{children}</>
  }

  // 默认不显示任何内容（等待重定向）
  return null
}

