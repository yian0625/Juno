'use client'

import React from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs'

export default function AntdRegistry({ children }: { children: React.ReactNode }) {
  const cache = React.useMemo(() => createCache(), [])
  const isServerInserted = React.useRef(false)
  
  useServerInsertedHTML(() => {
    // 避免重复插入
    if (isServerInserted.current) {
      return
    }
    isServerInserted.current = true
    return <style id="antd" dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }} />
  })

  return <StyleProvider cache={cache}>{children}</StyleProvider>
}

