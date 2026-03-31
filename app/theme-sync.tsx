"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

/**
 * 主题同步组件
 *
 * 关键问题：CSS 中无法使用 `only` 关键字！
 * 只有 JavaScript 的 inline style 才支持 `color-scheme: only light/dark`
 *
 * 工作原理：
 * 1. next-themes 管理 .dark class 的添加/移除
 * 2. Tailwind 的 @custom-variant dark 根据 .dark class 应用样式
 * 3. 此组件用 JavaScript 设置 color-scheme 属性，强制忽略系统偏好
 */
export function ThemeSync() {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    console.log('🎨 [ThemeSync] theme:', theme, 'resolvedTheme:', resolvedTheme)

    // 关键修复：所有模式都使用 'only' 关键字，完全忽略系统偏好
    // 这样可以确保手动模式和系统模式的效果完全一致
    if (theme === 'system') {
      // 系统模式：根据 resolvedTheme 设置，但也使用 only 防止浏览器混入系统偏好
      if (resolvedTheme === 'dark') {
        document.documentElement.style.colorScheme = 'only dark'
      } else {
        document.documentElement.style.colorScheme = 'only light'
      }
    } else if (theme === 'dark') {
      // 手动黑暗模式：使用 only dark
      document.documentElement.style.colorScheme = 'only dark'
    } else if (theme === 'light') {
      // 手动明亮模式：使用 only light
      document.documentElement.style.colorScheme = 'only light'
    }

    console.log('🎨 [ThemeSync] style.colorScheme:', document.documentElement.style.colorScheme)
  }, [mounted, theme, resolvedTheme])

  return null
}
