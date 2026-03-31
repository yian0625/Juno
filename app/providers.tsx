"use client"

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ThemeProvider as AntdThemeProvider } from 'antd-style'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import { ThemeSync } from './theme-sync'

/**
 * 全局 Provider 组件
 * 使用 next-themes 提供主题切换功能
 * 使用 antd-style 提供 antd 组件的主题支持
 *
 * 配置说明：
 * 1. attribute="class" - 使用 CSS class 控制主题（配合 Tailwind）
 * 2. enableSystem={true} - 支持"跟随系统"模式
 * 3. enableColorScheme={false} - 禁用自动 color-scheme 管理
 *    （交由 ThemeSync 组件手动管理，使用 'only' 关键字防止系统偏好干扰）
 * 4. ThemeSync 组件确保手动模式下完全忽略系统偏好
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      enableColorScheme={false}
      disableTransitionOnChange
      storageKey="theme"
    >
      <AntdThemeProvider>
        <TooltipProvider>
          <ThemeSync />
          {children}
          <Toaster richColors />
        </TooltipProvider>
      </AntdThemeProvider>
    </NextThemesProvider>
  )
}

