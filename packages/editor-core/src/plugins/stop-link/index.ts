// Stop-link — keep the link mark from leaking onto text that is not a link.
//
// A link is a MARK, so ProseMirror stores it as a pending mark after a delete
// (the same mechanism that makes typing after a deleted bold word stay bold).
// For a link that is wrong: the next keystroke must not inherit a href that
// is no longer under the cursor. Two complementary pieces:
//
//   1. A $prose plugin that strips an orphan stored link the moment the
//      cursor is not inside a link (covers select-delete, backspace, …).
//   2. A Space keymap that also clears the stored mark — Milkdown's link
//      mark is inclusive, so Space is how you stop extending a live link
//      while typing at its end (the forum's original stop-link behaviour).
//
// A stored link mark is ONLY valid while the cursor sits inside a link. This
// plugin will therefore strip an "armed" toggleLink on an empty selection
// outside a link — insert via insertLinkCommand instead. Pure: no host policy.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $command, $prose, $useKeymap } from '@milkdown/kit/utils'
import { linkSchema } from '@milkdown/kit/preset/commonmark'
import { commandsCtx } from '@milkdown/kit/core'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { MarkType } from '@milkdown/kit/prose/model'
import type { EditorState } from '@milkdown/kit/prose/state'

const hasMark = (state: EditorState, type: MarkType) => {
  if (!type) {
    return false
  }
  const { from, $from, to, empty } = state.selection
  if (empty) {
    return !!type.isInSet(state.storedMarks || $from.marks())
  }
  return state.doc.rangeHasMark(from, to, type)
}

/** Removes the stored link mark if one is active, letting the next keystroke
 * start un-linked text. Returns false so the Space still inserts a space. */
export const stopLinkCommand = $command('StopLink', (ctx) => () => {
  return (state, dispatch) => {
    const markType = linkSchema.type(ctx)
    const checkMark = hasMark(state, markType)
    if (checkMark) {
      dispatch?.(
        state.tr.removeStoredMark(markType).setMeta('addToHistory', false)
      )
    }
    return false
  }
})

/** Binds Space to the stop-link command. */
export const linkCustomKeymap = $useKeymap('linkCustomKeymap', {
  StopLink: {
    shortcuts: ['Space'],
    command: (ctx) => {
      const commands = ctx.get(commandsCtx)
      return () => commands.call(stopLinkCommand.key)
    }
  }
})

const orphanLinkKey = new PluginKey('KUN_ORPHAN_LINK')

const clearOrphanLink = $prose(
  (ctx) =>
    new Plugin({
      key: orphanLinkKey,
      appendTransaction(_transactions, _oldState, newState) {
        const { storedMarks, selection } = newState
        if (!selection.empty || !storedMarks) {
          return null
        }
        const linkType = linkSchema.type(ctx)
        if (!linkType.isInSet(storedMarks)) {
          return null
        }
        // Still inside a link — keep the stored mark so typing continues it.
        if (linkType.isInSet(selection.$from.marks())) {
          return null
        }
        // Housekeeping: do not occupy an undo step of its own.
        return newState.tr
          .removeStoredMark(linkType)
          .setMeta('addToHistory', false)
      }
    })
)

/** The stop-link plugin bundle: the command, its Space keymap, and the orphan
 * cleanup. Pure. `$useKeymap` returns a `[ctx, shortcut]` tuple, so flatten
 * before use. */
export const createStopLinkPlugin = (): MilkdownPlugin[] =>
  [stopLinkCommand, linkCustomKeymap, clearOrphanLink].flat() as MilkdownPlugin[]
