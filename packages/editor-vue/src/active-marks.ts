// Toggle-mark active state — one record, written by a ProseMirror plugin view
// on every editor update (including stored-mark-only toggles that change
// neither the doc nor the selection).
//
// Lives here (the Vue layer) because it is chrome state, not schema. A single
// reactive record is provided on KUN_EDITOR_CONTEXT so the toolbar, the
// selection bubble (a portal sibling), and the #toolbar slot API all read the
// same object. Do NOT subscribe via Milkdown's listener: `updated` is debounced
// 200ms and never unsubscribes.
import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { EditorState } from '@milkdown/kit/prose/state'
import type { Ctx } from '@milkdown/kit/ctx'
import {
  emphasisSchema,
  inlineCodeSchema,
  strongSchema
} from '@milkdown/kit/preset/commonmark'
import { strikethroughSchema } from '@milkdown/kit/preset/gfm'
import type { KunToggleMark } from './types'

export const TOGGLE_MARKS = ['bold', 'italic', 'strike', 'code'] as const

const schemas = {
  bold: strongSchema,
  italic: emphasisSchema,
  strike: strikethroughSchema,
  code: inlineCodeSchema
} as const

export const createEmptyActiveMarks = (): Record<KunToggleMark, boolean> => ({
  bold: false,
  italic: false,
  strike: false,
  code: false,
  spoiler: false
})

export const EMPTY_ACTIVE_MARKS: Readonly<Record<KunToggleMark, boolean>> =
  Object.freeze(createEmptyActiveMarks())

/** The spoiler is a NODE, not a mark: active when the caret sits inside one,
 * which is exactly when the 隐藏文本 button reveals instead of hides (see
 * `insertKunSpoilerCommand`). Read off the SCHEMA rather than the plugin ctx, so
 * it stays false — instead of throwing — when the host turned the feature off. */
const isInSpoiler = (state: EditorState): boolean => {
  const type = state.schema.nodes['kun-spoiler']
  if (!type) {
    return false
  }
  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type === type) {
      return true
    }
  }
  return false
}

/** Same decision `toggleMark` itself uses: stored marks at an empty caret,
 * `rangeHasMark` (any overlap) on a range. */
export const readActiveMarks = (
  state: EditorState,
  ctx: Ctx
): Record<KunToggleMark, boolean> => {
  const { from, $from, to, empty } = state.selection
  const out = createEmptyActiveMarks()
  for (const name of TOGGLE_MARKS) {
    const type = schemas[name].type(ctx)
    out[name] = empty
      ? !!type.isInSet(state.storedMarks ?? $from.marks())
      : state.doc.rangeHasMark(from, to, type)
  }
  out.spoiler = isInSpoiler(state)
  return out
}

const writeActiveMarks = (
  state: EditorState,
  ctx: Ctx,
  target: Record<KunToggleMark, boolean>
): void => {
  const next = readActiveMarks(state, ctx)
  for (const name of Object.keys(next) as KunToggleMark[]) {
    if (target[name] !== next[name]) {
      target[name] = next[name]
    }
  }
}

const activeMarksKey = new PluginKey('KUN_ACTIVE_MARKS')

/** Keep `target` in sync with the editor view for the life of the editor. */
export const createActiveMarksPlugin = (
  target: Record<KunToggleMark, boolean>
) =>
  $prose(
    (ctx) =>
      new Plugin({
        key: activeMarksKey,
        view: (view) => {
          writeActiveMarks(view.state, ctx, target)
          return {
            update(next) {
              writeActiveMarks(next.state, ctx, target)
            }
          }
        }
      })
  )
