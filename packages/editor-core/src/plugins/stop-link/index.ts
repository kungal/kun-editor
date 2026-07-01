// Stop-link keymap — pressing Space clears the active link mark so typing after
// a link doesn't keep extending the link. Ported from the forum's
// plugins/stop-link/stopLinkPlugin.ts. Pure: no host policy.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $command, $useKeymap } from '@milkdown/kit/utils'
import { linkSchema } from '@milkdown/kit/preset/commonmark'
import { commandsCtx } from '@milkdown/kit/core'
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

/** The stop-link plugin bundle: the command + its Space keymap. Pure.
 * `$useKeymap` returns a `[ctx, shortcut]` tuple, so flatten before use. */
export const createStopLinkPlugin = (): MilkdownPlugin[] =>
  [stopLinkCommand, linkCustomKeymap].flat() as MilkdownPlugin[]
