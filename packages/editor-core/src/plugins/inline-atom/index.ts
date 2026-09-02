// Inline-atom deletion — Backspace / Delete beside a non-editable inline atom
// (an @mention chip, a #floor reference, inline math, …) removes THAT NODE in
// one ProseMirror transaction, never through the browser's contenteditable.
//
// Why a plugin. An inline atom renders as `contenteditable="false"`. With the
// caret right next to one, none of the base keymap's Backspace commands apply
// (not a block boundary, nothing selected), so ProseMirror lets the browser try
// — and only on a REAL keydown does prosemirror-view's own `captureKeyDown`
// step in and delete the node itself. Virtual keyboards do not send one:
// Chrome Android reports keyCode 229 for the IME's Backspace, that safety net
// never runs, the browser's native deletion of a non-editable element then
// "sometimes fails" (prosemirror-view's words), and its fallback for exactly
// this case is `view.dom.blur(); view.focus()` plus a crude one-position
// delete 50 ms later. That blur/focus pair is the keyboard closing and
// reopening on every chip a phone user deletes.
//
// `beforeinput` is the one event every input path shares — hardware key, IME,
// virtual keyboard, the context-menu Delete — and `deleteContentBackward` /
// `deleteContentForward` are cancelable outside a composition. So: when the
// selection is adjacent to (or IS) an inline atom, cancel the native edit and
// dispatch the deletion. Same outcome as captureKeyDown, on every path, before
// the browser touches the DOM. Generic: any inline `atom: true` / leaf node
// qualifies, so the next chip gets this for free. Block atoms are left alone —
// at a block boundary the base keymap's own `selectNodeBackward` /
// `selectNodeForward` already turn them into a node selection first.
//
// The companion is a CSS rule, not code: with a chip LAST in its block,
// prosemirror-view appends `<img class="ProseMirror-separator">` + a trailing
// `<br>` so Chrome / Safari can draw the caret after it. A host's generic `img`
// rule (Tailwind's preflight makes every img display:block) turns that
// separator into a block box and the caret drops a line — the reference
// stylesheet in @kungal/editor-nuxt pins it back to an invisible inline.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import type { Node } from '@milkdown/kit/prose/model'
import { undoInputRule } from '@milkdown/kit/prose/inputrules'
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection
} from '@milkdown/kit/prose/state'
import type { EditorState, Transaction } from '@milkdown/kit/prose/state'
import { $prose } from '@milkdown/kit/utils'

export const inlineAtomKey = new PluginKey('KUN_INLINE_ATOM')

/** An inline node with no editable inside: `atom: true`, or a leaf such as a
 * hard break or an image. Text is a leaf too — excluded, it is what the browser
 * deletes perfectly well on its own. */
export const isInlineAtom = (node: Node | null | undefined): node is Node =>
  !!node && node.isInline && !node.isText && node.isAtom

/**
 * The transaction that deletes the inline atom the selection touches in `dir`
 * (`-1`: the node before the caret, Backspace; `1`: the node after, Delete), or
 * `null` when there is none — a range selection, a caret beside text, a block
 * boundary. A node selection ON an inline atom deletes that atom for either
 * direction.
 */
export const deleteInlineAtom = (
  state: EditorState,
  dir: -1 | 1
): Transaction | null => {
  const { selection } = state
  if (selection instanceof NodeSelection) {
    return isInlineAtom(selection.node)
      ? state.tr.deleteSelection().scrollIntoView()
      : null
  }
  if (!(selection instanceof TextSelection) || !selection.$cursor) {
    return null
  }
  const { $cursor } = selection
  const node = dir < 0 ? $cursor.nodeBefore : $cursor.nodeAfter
  if (!isInlineAtom(node)) {
    return null
  }
  const from = dir < 0 ? $cursor.pos - node.nodeSize : $cursor.pos
  return state.tr.delete(from, from + node.nodeSize).scrollIntoView()
}

const inlineAtomDeletion = $prose(
  () =>
    new Plugin({
      key: inlineAtomKey,
      props: {
        handleDOMEvents: {
          beforeinput: (view, event) => {
            const dir =
              event.inputType === 'deleteContentBackward'
                ? -1
                : event.inputType === 'deleteContentForward'
                  ? 1
                  : 0
            // Mid-composition the IME owns the text; interfering corrupts it.
            if (!dir || view.composing) {
              return false
            }
            // Backspace straight after an input rule fired undoes the rule —
            // the first link of the base keymap's own Backspace chain, kept
            // for the paths that never reach a keymap.
            if (dir < 0 && undoInputRule(view.state, view.dispatch)) {
              event.preventDefault()
              return true
            }
            const tr = deleteInlineAtom(view.state, dir)
            if (!tr) {
              return false
            }
            event.preventDefault()
            view.dispatch(tr)
            return true
          }
        }
      }
    })
)

/** The inline-atom plugin bundle: one `beforeinput` prop. Pure, always on. */
export const createInlineAtomPlugin = (): MilkdownPlugin[] =>
  [inlineAtomDeletion].flat()
