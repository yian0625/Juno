import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
// 暂时移除 Google Fonts 以避免网络超时问题
// import { Noto_Serif_SC, Noto_Sans_SC } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from './providers'
import { AuthGuard } from '@/components/auth-guard'
import './globals.css'

// const notoSerifSC = Noto_Serif_SC({
//   weight: ['400', '700'],
//   subsets: ['latin'],
//   variable: '--font-noto-serif-sc',
//   display: 'swap',
// })

// const notoSansSC = Noto_Sans_SC({
//   weight: ['300', '400', '500', '700'],
//   subsets: ['latin'],
//   variable: '--font-noto-sans-sc',
//   display: 'swap',
// })

// 强制动态渲染整个应用
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Juno',
  description: 'Juno AI Chat Assistant',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        <Providers>
          <AuthGuard>
            {children}
          </AuthGuard>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
