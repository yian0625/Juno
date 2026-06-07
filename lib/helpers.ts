export function formatTime(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function isEmojiAvatar(url: string) {
  return url && !url.startsWith('http') && !url.startsWith('/') && !url.startsWith('data:')
}

export function isLocalMessage(msgId: string) {
  return msgId.startsWith('user-') || msgId.startsWith('assistant-')
}
