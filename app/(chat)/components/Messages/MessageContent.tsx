"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { ChatMsg } from "@/lib/stores"

const AGENT_STATUS_PREFIX = "[[JUNO_AGENT_STATUS]] "

interface Props {
  msg: ChatMsg
}

function MarkdownBlock({ content }: { content: string }) {
  if (!content.trim()) return null
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt || ""} className="max-w-full sm:max-w-[480px] rounded-lg my-2" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function AssistantContent({ content }: { content: string }) {
  const nodes: Array<{ type: "markdown" | "status"; content: string }> = []
  let markdownLines: string[] = []

  const flushMarkdown = () => {
    if (markdownLines.length === 0) return
    nodes.push({ type: "markdown", content: markdownLines.join("\n") })
    markdownLines = []
  }

  for (const line of content.split("\n")) {
    if (line.startsWith(AGENT_STATUS_PREFIX)) {
      flushMarkdown()
      nodes.push({ type: "status", content: line.slice(AGENT_STATUS_PREFIX.length).trim() })
    } else {
      markdownLines.push(line)
    }
  }
  flushMarkdown()

  return (
    <>
      {nodes.map((node, index) => (
        node.type === "status" ? (
          <div key={`status-${index}`} className="juno-agent-status-line">
            <span>{node.content}</span>
          </div>
        ) : (
          <MarkdownBlock key={`markdown-${index}`} content={node.content} />
        )
      ))}
    </>
  )
}

export default function MessageContent({ msg }: Props) {
  if (msg.role === "assistant") {
    return (
      <div className="juno-message-content prose prose-sm dark:prose-invert max-w-none break-words">
        <AssistantContent content={msg.content || (msg.isStreaming ? "" : "")} />
        {msg.isStreaming && !msg.content && (
          <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse" />
        )}
      </div>
    )
  }

  return <p className="juno-user-content text-sm whitespace-pre-wrap break-words">{msg.content}</p>
}
