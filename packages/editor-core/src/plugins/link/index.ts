// Insert-link command — the click-to-insert behaviour over the commonmark `link`
// MARK. The mark itself already exists (commonmark, so `[text](url)` round-trips
// and pasted URLs autolink); this adds a command the toolbar / selection bubble
// call to apply it. Standard markdown `[text](url)`.
//
// A link is a MARK (inline formatting on text) — deliberately distinct from the
// custom NODE embeds (mention, quote) that follow the schema + toUrl/fromUrl
// pattern. A rich "article card" would be a node like those, not this.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $command } from '@milkdown/kit/utils'
import { linkSchema } from '@milkdown/kit/preset/commonmark'

export interface InsertLinkPayload {
  /** The URL. Required — a blank href is a no-op. */
  href: string
  /** Text to insert + link when the selection is empty. Defaults to the href. */
  text?: string
}

/**
 * Apply the `link` mark with `href` to the selection; on an EMPTY selection,
 * insert `text` (or the href) and link that. Clears the stored mark afterwards so
 * typing past the link isn't linked (same intent as the stop-link keymap).
 */
export const insertLinkCommand = $command(
  'InsertKunLink',
  (ctx) =>
    (payload?: InsertLinkPayload) =>
    (state, dispatch) => {
      const href = payload?.href?.trim()
      if (!href) {
        return false
      }
      const markType = linkSchema.type(ctx)
      const mark = markType.create({ href })
      const { from, to, empty } = state.selection
      if (empty) {
        const text = payload?.text?.trim() || href
        const tr = state.tr.insertText(text, from)
        tr.addMark(from, from + text.length, mark)
        tr.removeStoredMark(markType)
        dispatch?.(tr.scrollIntoView())
      } else {
        dispatch?.(state.tr.addMark(from, to, mark).scrollIntoView())
      }
      return true
    }
)

/** The link plugin bundle: the insert-link command. */
export const createLinkPlugin = (): MilkdownPlugin[] => [insertLinkCommand].flat()
