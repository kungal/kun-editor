// Placeholder — text shown when the editor (or the current block) is empty.
//
// Same mechanism as Milkdown Crepe's placeholder feature (the current, v7 way):
// a $prose ProseMirror plugin that adds a NODE DECORATION to the empty block —
// a `.kun-editor__placeholder` class + a `data-placeholder` attribute. The text
// is rendered by CSS (`::before { content: attr(data-placeholder) }`), so it's
// purely visual — never part of the doc or the markdown output. Headless: this
// core ships only the class/attr hook; the `::before` rule lives in the host's
// stylesheet (see the reference kun-editor.css).
//
// mode 'block' (default): show on whichever empty block the cursor is in (Notion
// style). mode 'doc': show only when the whole document is empty. Skipped in
// readonly, code blocks, lists and tables, and whenever there's a selection.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { editorViewOptionsCtx } from '@milkdown/kit/core'
import type { EditorState } from '@milkdown/kit/prose/state'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import type { Node } from '@milkdown/kit/prose/model'
import { $prose } from '@milkdown/kit/utils'

export type PlaceholderMode = 'doc' | 'block'

export interface PlaceholderConfig {
  /** The placeholder text. Empty string disables the placeholder. */
  text?: string
  /** `'block'` (default) shows on any empty block; `'doc'` only when empty. */
  mode?: PlaceholderMode
}

// Blocks whose own emptiness shouldn't trigger the paragraph-style placeholder.
const SKIP_PARENTS = new Set([
  'code_block',
  'bullet_list',
  'ordered_list',
  'list_item',
  'table'
])

const isDocEmpty = (doc: Node): boolean =>
  doc.childCount <= 1 && !doc.firstChild?.content.size

const isInSkippedParent = (state: EditorState): boolean => {
  const { $anchor } = state.selection
  for (let depth = $anchor.depth; depth > 0; depth--) {
    if (SKIP_PARENTS.has($anchor.node(depth).type.name)) {
      return true
    }
  }
  return false
}

/**
 * The placeholder plugin. `text` is baked in at creation (the editor is built
 * once); pass it from `createKunEditorPlugins(..., { placeholder })`.
 */
export const createPlaceholderPlugin = (
  config: PlaceholderConfig = {}
): MilkdownPlugin[] => {
  const text = config.text ?? ''
  const mode = config.mode ?? 'block'

  const plugin = $prose(
    (ctx) =>
      new Plugin({
        key: new PluginKey('KUN_PLACEHOLDER'),
        props: {
          decorations: (state) => {
            if (!text) {
              return null
            }
            // Don't show in a read-only editor.
            const editable = ctx.get(editorViewOptionsCtx).editable
            if (editable && !editable(state)) {
              return null
            }
            if (mode === 'doc' && !isDocEmpty(state.doc)) {
              return null
            }
            const { selection } = state
            if (!selection.empty || isInSkippedParent(state)) {
              return null
            }
            const node = selection.$anchor.parent
            if (node.content.size > 0) {
              return null
            }
            const before = selection.$anchor.before()
            return DecorationSet.create(state.doc, [
              Decoration.node(before, before + node.nodeSize, {
                class: 'kun-editor__placeholder',
                'data-placeholder': text
              })
            ])
          }
        }
      })
  )

  return [plugin].flat()
}
