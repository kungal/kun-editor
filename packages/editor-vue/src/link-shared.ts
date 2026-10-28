// Shared by every link entry point (the selection bubble, both toolbars,
// Mod-K): the editor's labels, the host's `linkPrompt` answer made uniform,
// and the clipboard peek that prefills 链接 — never with a permission prompt.
import type { KunEditorLocale, LinkPrompt } from '@kungal/editor-core'

/** Fired on the editor DOM by the Mod-K keymap: open the link editor. */
export const KUN_LINK_EDITOR_EVENT = 'kun-editor:link'

export const linkLabels = (locale: KunEditorLocale | undefined) => {
  const en = (locale ?? 'zh-cn').toLowerCase().startsWith('en')
  return en
    ? { title: 'Edit link', text: 'Text', href: 'Link', apply: 'Apply', cancel: 'Cancel', unlink: 'Remove link', open: 'Open', needHref: 'Enter a link' }
    : { title: '编辑链接', text: '文本', href: '链接', apply: '确定', cancel: '取消', unlink: '移除链接', open: '打开', needHref: '请输入链接' }
}

/** The host's `linkPrompt`, asked with the current text: `{ text?, href }`,
 * or null when it cancelled (or answered nothing usable). */
export const askLinkPrompt = async (
  linkPrompt: LinkPrompt,
  text: string
): Promise<{ text?: string; href: string } | null> => {
  const answer = await linkPrompt({ text })
  if (!answer) return null
  if (typeof answer === 'string') {
    return answer.trim() ? { href: answer } : null
  }
  return answer.href?.trim() ? { text: answer.text, href: answer.href } : null
}

/** One URL-looking token: a scheme, or a `www.` / dotted host at the start. */
const URL_LIKE = /^(?:[a-z][a-z0-9+.-]*:\/\/\S+|www\.\S+\.\S+|[^\s/@]+\.[a-z]{2,}(?:[/?#]\S*)?)$/i

/**
 * The clipboard's text when it is ONE URL and can be read WITHOUT asking:
 * only if the Permissions API already reports `clipboard-read` as granted
 * (Chromium, once the user allowed it). Anywhere else — Firefox / Safari,
 * no permission yet, any error — nothing, silently.
 */
export const peekClipboardUrl = async (): Promise<string | null> => {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.clipboard?.readText) {
      return null
    }
    const status = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })
    if (status.state !== 'granted') return null
    const text = (await navigator.clipboard.readText()).trim()
    return URL_LIKE.test(text) ? text : null
  } catch {
    return null
  }
}
