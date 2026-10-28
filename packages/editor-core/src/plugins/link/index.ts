// Insert-link command — the click-to-insert behaviour over the commonmark `link`
// MARK. The mark itself already exists (commonmark, so `[text](url)` round-trips
// and pasted URLs autolink); this adds a command the toolbar / selection bubble
// call to apply it. Standard markdown `[text](url)`.
//
// A link is a MARK (inline formatting on text) — deliberately distinct from the
// custom NODE embeds (mention, quote) that follow the schema + toUrl/fromUrl
// pattern. A rich "article card" would be a node like those, not this.
//
// The bundle also carries ./autolink: a URL is linked the way pasting it is
// once it is complete — committed whole by one input (an Android keyboard's
// clipboard strip), or ended by a space / Enter when typed by hand.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $command } from '@milkdown/kit/utils'
import { linkSchema } from '@milkdown/kit/preset/commonmark'
import { normalizeLinkHref } from '../../href'
import { autolinkInputPlugin } from './autolink'
import { applyLink, removeLink } from './edit'

export { autolinkInputPlugin } from './autolink'
export { linkDraft, linkAtSelection, applyLink, removeLink } from './edit'
export type { LinkDraft } from './edit'

export interface InsertLinkPayload {
  /**
   * The URL. Required — a blank href is a no-op. Normalized on the way in, so a
   * schemeless host gets one: `www.a.com/x` → `https://www.a.com/x`. See
   * {@link normalizeLinkHref} for the exact rules.
   */
  href: string
  /** Text to insert + link when the selection is empty. Defaults to the href. */
  text?: string
}

/**
 * Apply the `link` mark with `href` to the selection; on an EMPTY selection,
 * insert `text` (or the href) and link that. Clears the stored mark afterwards so
 * typing past the link isn't linked (same intent as the stop-link keymap).
 *
 * The href is normalized here — this command is the single funnel every link
 * entry point (bubble, toolbar, host `linkPrompt`) goes through, so a UI never
 * has to, and every one of them behaves the same.
 */
export const insertLinkCommand = $command(
  'InsertKunLink',
  (ctx) =>
    (payload?: InsertLinkPayload) =>
    (state, dispatch) => {
      const href = normalizeLinkHref(payload?.href ?? '')
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

/**
 * Set `[text](href)` on the selection — what the link editor applies. The
 * range is the existing link at the selection, else the selection, else the
 * caret (see `linkDraft`); `text` replaces that range's text when it differs
 * (and may: plain text in one block), falls back to the URL when empty. One
 * transaction, so one undo; a bare entity URL becomes its chip / card.
 */
export const setLinkCommand = $command(
  'SetKunLink',
  () =>
    (payload?: { text?: string; href: string }) =>
    (state, dispatch) => {
      const tr = state.tr
      if (!payload || !applyLink(tr, state, payload)) {
        return false
      }
      dispatch?.(tr.scrollIntoView())
      return true
    }
)

/** Remove the link at the selection — the whole link, its text kept. */
export const removeLinkCommand = $command(
  'RemoveKunLink',
  () => () => (state, dispatch) => {
    const tr = state.tr
    if (!removeLink(tr, state)) {
      return false
    }
    dispatch?.(tr)
    return true
  }
)

/** The link plugin bundle: the link commands and autolink on input. */
export const createLinkPlugin = (): MilkdownPlugin[] =>
  [insertLinkCommand, setLinkCommand, removeLinkCommand, autolinkInputPlugin].flat()
