// Stop-link keymap — pressing Space clears the active link mark so typing after
// a link doesn't keep extending the link. Ported from the forum's
// plugins/stop-link/stopLinkPlugin.ts. Pure: no host policy.
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
      dispatch?.(state.tr.removeStoredMark(markType))
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

// A link is a MARK, so deleting its text leaves the link as a STORED mark — the
// pending mark ProseMirror re-applies to the next keystroke (the same reason
// typing right after a deleted bold word stays bold). For a link that's wrong:
// ending the link must not make every following character a link. The Space
// keymap above clears it when you keep typing, but a select-then-delete leaves
// no Space to press. Clear the stored link mark the moment the cursor is no
// longer inside a link.
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
        if (!storedMarks.some((m) => m.type === linkType)) {
          return null
        }
        // The cursor still sits inside a link (the mark is in the surrounding
        // marks) — keep the stored mark so typing continues the link.
        if (selection.$from.marks().some((m) => m.type === linkType)) {
          return null
        }
        return newState.tr.removeStoredMark(linkType)
      }
    })
)

/** The stop-link plugin bundle: the command, its Space keymap, and the orphan
 * cleanup. Pure. `$useKeymap` returns a `[ctx, shortcut]` tuple, so flatten
 * before use. */
export const createStopLinkPlugin = (): MilkdownPlugin[] =>
  [stopLinkCommand, linkCustomKeymap, clearOrphanLink].flat() as MilkdownPlugin[]
