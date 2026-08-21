// The href already carried by the current selection — shared by the two headless
// link entry points (the fixed toolbar's panel and the selection bubble's inline
// input) so both prefill the same way: editing a link's URL is the same gesture
// as adding one, and `insertLinkCommand`'s `addMark` replaces the old mark.
import { linkSchema } from '@milkdown/kit/preset/commonmark'
import type { Ctx } from '@milkdown/kit/ctx'
import type { EditorState } from '@milkdown/kit/prose/state'

/** The first link href in the selection, or '' when the selection is plain. */
export const readSelectedHref = (state: EditorState, ctx: Ctx): string => {
  const type = linkSchema.type(ctx)
  const { from, to } = state.selection
  let href = ''
  state.doc.nodesBetween(from, to, (node) => {
    if (href) {
      return false
    }
    const mark = type.isInSet(node.marks)
    if (mark) {
      href = String(mark.attrs.href ?? '')
    }
    return true
  })
  return href
}
