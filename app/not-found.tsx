'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">页面未找到</p>
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => router.back()}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回上一页
          </Button>
          <Button
            onClick={() => router.push('/')}
          >
            <Home className="h-4 w-4 mr-2" />
            返回首页
          </Button>
        </div>
      </div>
    </div>
  )
}

