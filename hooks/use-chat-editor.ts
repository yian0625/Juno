import { useEditor } from "@tiptap/react"
import { useCallback, useMemo, useRef } from "react"

import { Extension } from "@tiptap/core"
import Document from "@tiptap/extension-document"
import Paragraph from "@tiptap/extension-paragraph"
import Text from "@tiptap/extension-text"
import { useLatest } from "ahooks"
import type { Editor } from "@tiptap/react"

/**
 * @description: 获取编辑器中所有文本内容
 */
function getPlainText(editor: Editor): string {
  const text = editor.getText({ blockSeparator: "\n" }) ?? ""
  return text.trim()
}

/**
 * @description: 是否有显式换行
 */
function hasExplicitWrap(transaction?: any): boolean {
  if (!transaction) return false

  return transaction.steps.some((step: any) => {
    const json = step.toJSON?.()
    if (!json) return false

    if (json.stepType !== "replace" && json.stepType !== "replaceAround") return false

    const sliceContent = (json as { slice?: { content?: Array<{ type?: string }> } }).slice?.content
    if (!Array.isArray(sliceContent)) return false

    return sliceContent.some((node) => node?.type === "paragraph")
  })
}

/**
 * @description: 是否有软换行
 */
function hasSoftWrap(editor: Editor): boolean {
  if (typeof window === "undefined") return false

  const dom = editor.view?.dom
  if (!dom) return false
  
  // 方法1: 检查段落内是否有多行
  // 遍历所有段落元素，检查它们的高度
  const paragraphs = dom.querySelectorAll("p")
  for (const p of Array.from(paragraphs)) {
    const pHeight = p.getBoundingClientRect().height
    // 单行高度是 24px (leading-6)
    // 如果段落高度 > 30px，说明这个段落有软换行
    if (pHeight > 30) {
      return true
    }
  }
  
  // 方法2: 检查整体高度
  const { height } = dom.getBoundingClientRect()
  const scrollHeight = dom.scrollHeight
  
  // 使用更大的阈值来确保准确性
  const LINE_HEIGHT = 24
  const THRESHOLD = LINE_HEIGHT + 8 // 32px
  
  return scrollHeight > THRESHOLD || height > THRESHOLD
}

export type UseChatEditorOptions = Partial<{
  onContentChange: (content: string) => void
  onStatusChange: (status: { isEmpty: boolean; isWrap: boolean }) => void
  onEnterKey: () => boolean // 返回 true 表示阻止默认行为
}>

/**
 * @description: 聊天编辑器 Hook
 */
export function useChatEditor(options: UseChatEditorOptions) {
  const { onContentChange, onStatusChange, onEnterKey } = options

  const onContentChangeRef = useLatest(onContentChange ?? (() => {}))
  const onStatusChangeRef = useLatest(onStatusChange ?? (() => {}))
  const onEnterKeyRef = useLatest(onEnterKey ?? (() => false))

  // 跟踪输入法组合状态（参照 lobe-chat 的实现）
  const isComposingRef = useRef(false)
  // 用于取消待处理的检测任务
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // 保存最后一次的 transaction，用于手动触发检测
  const lastTransactionRef = useRef<any>(null)

  // 使用 useMemo 稳定 extensions 配置
  const extensions = useMemo(
    () => [
      Document,
      Paragraph,
      Text,
      Extension.create({
        name: "keyboardShortcuts",
        addKeyboardShortcuts() {
          return {
            Enter: () => {
              // 如果正在使用输入法（中文、日文等），不发送消息，让输入法处理
              // 参照 lobe-chat: 只检查 isComposing 状态，不需要额外的 justFinishedComposing
              if (isComposingRef.current) {
                return false
              }

              // 否则调用外部回调发送消息
              return onEnterKeyRef.current()
            },
            "Shift-Enter": () => {
              const isEmpty = this.editor.isEmpty
              if (isEmpty) return true

              this.editor.commands.first(({ commands: c }) => [
                () => c.newlineInCode(),
                () => c.createParagraphNear(),
                () => c.liftEmptyBlock(),
                () => c.splitBlock(),
              ])
              return true
            },
          }
        },
      }),
    ],
    [onEnterKeyRef]
  )

  const editor = useEditor(
    {
      autofocus: true,
      immediatelyRender: false,
      extensions,
      onCreate: ({ editor: e }) => {
        // 监听输入法组合事件（参照 lobe-chat 的实现）
        const editorElement = e.view.dom

        const handleCompositionStart = () => {
          isComposingRef.current = true
        }

        const handleCompositionEnd = () => {
          isComposingRef.current = false
        }

        editorElement.addEventListener("compositionstart", handleCompositionStart)
        editorElement.addEventListener("compositionend", handleCompositionEnd)

        // 清理函数会在编辑器销毁时自动调用
        return () => {
          editorElement.removeEventListener("compositionstart", handleCompositionStart)
          editorElement.removeEventListener("compositionend", handleCompositionEnd)
        }
      },
      onTransaction: ({ editor: e, transaction }) => {
        // 保存最后一次的 transaction
        lastTransactionRef.current = transaction
        
        // 取消之前的检测任务（避免累积）
        if (checkTimeoutRef.current !== null) {
          clearTimeout(checkTimeoutRef.current)
        }
        
        // 使用较短的延迟确保 DOM 完全更新和布局计算完成后再检查
        // 10ms 的延迟足以让浏览器完成布局计算，同时不会让用户感知到延迟
        checkTimeoutRef.current = setTimeout(() => {
          const isEmpty = e.isEmpty
          const hasExplicitWrapNow = hasExplicitWrap(transaction)
          const isWrap = !isEmpty && (hasExplicitWrapNow || hasSoftWrap(e))
          
          onStatusChangeRef.current({ isEmpty, isWrap })
          checkTimeoutRef.current = null
        }, 10)
      },
      onUpdate: ({ editor: e }) => {
        const content = getPlainText(e)
        onContentChangeRef.current(content)
      },
    },
    [extensions]
  )

  const providerValue = useMemo(() => ({ editor }), [editor])

  /**
   * @description: 插入输入内容
   */
  const insertContent = useCallback(
    (content: string) => {
      if (!editor) return

      if (content) editor.chain().focus().insertContent(content).run()
    },
    [editor]
  )

  /**
   * @description: 获取当前编辑器的纯文本内容
   */
  const getContent = useCallback(() => {
    if (!editor) return ""
    return getPlainText(editor)
  }, [editor])

  /**
   * @description: 清空编辑器内容
   */
  const clearContent = useCallback(() => {
    if (!editor) return
    editor.commands.clearContent()
  }, [editor])

  /**
   * @description: 设置编辑器焦点
   */
  const focus = useCallback(() => {
    if (!editor) return
    editor.commands.focus()
  }, [editor])

  return {
    editor,
    providerValue,
    insertContent,
    getContent,
    clearContent,
    focus,
  }
}

