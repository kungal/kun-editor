// Spoiler plugin — the `||hidden text||` inline node.
//
// Ported (behaviour-wise) from the forum's plugins/spoiler/spoilerPlugin.ts.
// This is a PURE plugin: it needs no host policy, so there is no adapter
// argument — just a `createSpoilerPlugin()` factory returning the Milkdown
// plugin bundle, matching the folder contract in ../README.md.
//
// The syntax `||text||` is the KUN ecosystem's own markdown extension (shared
// with the server renderer), so the round-trip lives here in core, not in a host.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import type { Node } from '@milkdown/kit/transformer'
import type {
  NodeType,
  Node as ProseNode,
  ResolvedPos
} from '@milkdown/kit/prose/model'
import { Fragment } from '@milkdown/kit/prose/model'
import { expectDomTypeError } from '@milkdown/kit/exception'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import { NodeSelection, TextSelection } from '@milkdown/kit/prose/state'
import {
  $command,
  $inputRule,
  $nodeAttr,
  $nodeSchema,
  $remark
} from '@milkdown/kit/utils'
import { visit } from 'unist-util-visit'
import type { Node as UnistNode } from 'unist'

interface SpoilerNode extends Node {
  type: 'kun-spoiler' | 'text'
  value?: string
  children?: SpoilerNode[]
}

/** DOM attrs for the rendered spoiler chip. The styling references KunUI CSS
 * variables so it inherits the host theme (the render layer ships the vars). */
export const spoilerAttr = $nodeAttr('kun-spoiler', () => ({
  container: {
    class: 'kun-spoiler',
    style:
      'background: var(--color-default-500); border-radius: var(--radius-sm); padding: 0 4px; cursor: pointer;'
  }
}))

/** The zero-width space this plugin parks the caret on. A caret has to sit in a
 * TEXT node: with nothing after a spoiler the browser puts the next keystroke
 * inside it, and an empty spoiler has nowhere to type at all. Spelled as an
 * escape because the literal character is invisible in a source file. */
const CARET_ANCHOR = '\u200b'

/** Anchors are an editor device, never content: strip them from any text moving
 * between a spoiler and the document (or the markdown). */
const withoutAnchors = (content: Fragment): Fragment => {
  const kept: ProseNode[] = []
  content.forEach((child) => {
    if (!child.isText) {
      kept.push(child)
      return
    }
    const text = (child.text ?? '').replaceAll(CARET_ANCHOR, '')
    if (text) {
      kept.push(child.type.schema.text(text, child.marks))
    }
  })
  return Fragment.fromArray(kept)
}

/** The `kun-spoiler` inline node: parses/serializes `||text||` and renders a
 * `<span data-type="kun-spoiler">` the render layer toggles on click. */
export const spoilerSchema = $nodeSchema('kun-spoiler', (ctx) => ({
  group: 'inline',
  inline: true,
  content: 'inline*',
  marks: '',
  attrs: {
    revealed: {
      default: false
    }
  },
  parseDOM: [
    {
      tag: 'span[data-type="kun-spoiler"]',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) throw expectDomTypeError(dom)
        return {
          revealed: dom.getAttribute('data-revealed') === 'true'
        }
      }
    }
  ],
  toDOM: (node) => {
    const attrs = ctx.get(spoilerAttr.key)(node)
    return [
      'span',
      {
        ...attrs.container,
        'data-type': 'kun-spoiler',
        'data-revealed': node.attrs.revealed
      },
      0
    ]
  },
  parseMarkdown: {
    match: ({ type }) => type === 'kun-spoiler',
    runner: (state, node, type) => {
      state.openNode(type)
      state.next(node.children || [])
      state.closeNode()
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === 'kun-spoiler',
    runner: (state, node) => {
      const content = withoutAnchors(node.content)
      // Nothing but the caret anchor: the button was clicked and never typed
      // into. Emit nothing rather than a bare `||||`.
      if (!content.size) {
        return
      }
      state.addNode('text', undefined, '||')
      state.next(content)
      state.addNode('text', undefined, '||')
    }
  }
}))

/** The spoiler the position sits inside, if any. A spoiler holds inline content
 * (it is not an atom), so a caret in one resolves to a deeper `parent`. */
const enclosingSpoiler = (
  $pos: ResolvedPos,
  type: NodeType
): { pos: number; node: ProseNode } | null => {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth)
    if (node.type === type) {
      return { pos: $pos.before(depth), node }
    }
  }
  return null
}

/**
 * Toolbar entry point ("隐藏文本"): hide the selection, or reveal the spoiler the
 * caret is in. The only way into a spoiler other than typing `||…||`, so it has
 * to cover the same cases the syntax does:
 *
 * - a selection → its TEXT moves INSIDE the node. It has to be moved, not
 *   replaced: `replaceSelectionWith` on its own deletes what you selected. The
 *   schema is `marks: ''` (bold inside `||…||` cannot round-trip), so the
 *   formatting is what's dropped, never the words.
 * - an empty selection → an empty spoiler with the caret inside it: type, and
 *   what you type is hidden. "Empty" means holding a caret anchor — a caret
 *   cannot sit in an inline node with no text node in it — and a spoiler with
 *   nothing but an anchor serializes to nothing at all, so an unused one cannot
 *   rot into the document.
 * - the caret already inside a spoiler → reveal it, leaving the text selected.
 *   Nesting would serialize to `||||text||||`, which reads back as nothing at
 *   all, so this button has to toggle.
 *
 * Returns false where there is nothing to hide or nowhere to put it — inside a
 * code block, or with a NODE selected (an image is not text; replacing it would
 * delete it) — so a host can grey the button out. A spoiler holds text, so any
 * other inline node caught in a text selection (an image, inline math) does not
 * survive the move: `||…||` cannot carry one.
 */
export const insertKunSpoilerCommand = $command(
  'InsertKunSpoiler',
  (ctx) => () => (state, dispatch) => {
    const type = spoilerSchema.type(ctx)
    const { $from, from, to, empty } = state.selection

    const open = enclosingSpoiler($from, type)
    if (open) {
      if (dispatch) {
        const { pos, node } = open
        const revealed = withoutAnchors(node.content)
        // Take the anchor that follows the node with it, or toggling the button
        // back and forth stacks up invisible characters.
        const end = pos + node.nodeSize
        const trailing = state.doc.textBetween(
          end,
          Math.min(end + CARET_ANCHOR.length, state.doc.content.size)
        )
        const tr = state.tr.replaceWith(
          pos,
          trailing === CARET_ANCHOR ? end + CARET_ANCHOR.length : end,
          revealed
        )
        if (revealed.size) {
          // Leave the revealed text selected: the next click re-hides exactly
          // what this one revealed.
          tr.setSelection(TextSelection.create(tr.doc, pos, pos + revealed.size))
        }
        dispatch(tr.scrollIntoView())
      }
      return true
    }

    // A selected NODE (an image, a code block) is not text to hide, and
    // replacing the selection would delete it. Refuse.
    if (state.selection instanceof NodeSelection) {
      return false
    }
    // Refuse where a spoiler cannot go — a code block holds plain text. Guarded
    // on `isTextblock` because select-all is an `AllSelection`, which resolves
    // to the DOC: no textblock to ask, and `replaceSelection` puts the node in
    // a paragraph of its own.
    if (
      $from.parent.isTextblock &&
      !$from.parent.canReplaceWith($from.index(), $from.index(), type)
    ) {
      return false
    }
    if (!dispatch) {
      return true
    }

    // ' ' as the block separator: a selection spanning paragraphs collapses into
    // one spoiler, and the words either side of the break stay apart. With
    // nothing selected the node still needs a text node to hold the caret, so
    // it starts on an anchor — the serializer drops it again.
    const text = state.doc
      .textBetween(from, to, ' ')
      .replaceAll(CARET_ANCHOR, '')
    const node = type.create(null, state.schema.text(text || CARET_ANCHOR))
    const tr = state.tr.replaceSelectionWith(node, false)
    // `replaceSelectionWith` leaves the selection right after the node.
    const after = tr.selection.to
    tr.insertText(CARET_ANCHOR, after)
    dispatch(
      tr
        .setSelection(
          TextSelection.create(
            tr.doc,
            // On the anchor inside the empty node (type and it is hidden), or
            // past the one after a wrap (type and it is not).
            empty
              ? after - node.nodeSize + 1 + CARET_ANCHOR.length
              : after + 1
          )
        )
        .scrollIntoView()
    )
    return true
  }
)

/** Typing `||text||` in the editor turns it into a spoiler node in place. The
 * trailing zero-width space gives the caret a stable anchor after the atom. */
export const insertSpoilerInputRule = $inputRule(
  () =>
    new InputRule(/(?:^|\s)\|\|(.*?)\|\|$/, (state, match, start, end) => {
      const [fullMatch, content] = match
      if (!content) return null
      const startPos = start + (fullMatch.startsWith(' ') ? 1 : 0)
      const { tr } = state
      const schema = state.schema
      const spoilerNodeType = schema.nodes['kun-spoiler']
      if (!spoilerNodeType) return null

      const spoilerNode = spoilerNodeType.create(
        { revealed: false },
        schema.text(content)
      )
      const zeroWidthSpace = schema.text(CARET_ANCHOR)
      return tr
        .replaceWith(startPos, end, [spoilerNode, zeroWidthSpace])
        .setStoredMarks([])
        .scrollIntoView()
    })
)

/** Remark transform: splits `||...||` runs inside text nodes into `kun-spoiler`
 * mdast nodes on parse, so pasted / loaded markdown becomes real spoiler nodes. */
export const remarkSpoilerPlugin = $remark('remarkSpoiler', () => () => {
  const transformer = (tree: UnistNode) => {
    visit(tree, 'text', (node: SpoilerNode, index, parent: SpoilerNode) => {
      if (typeof node.value !== 'string' || !parent) {
        return
      }
      if (!node.value.includes('||')) {
        return
      }

      const regex = /\|\|(.*?)\|\|/g
      const newNodes: SpoilerNode[] = []
      let lastIndex = 0

      for (const match of node.value.matchAll(regex)) {
        const [full, content] = match
        const matchIndex = match.index ?? 0

        if (matchIndex > lastIndex) {
          newNodes.push({
            type: 'text',
            value: node.value.slice(lastIndex, matchIndex)
          })
        }

        if (content) {
          newNodes.push({
            type: 'kun-spoiler',
            children: [{ type: 'text', value: content }]
          })
        }

        lastIndex = matchIndex + full.length
      }

      if (lastIndex < node.value.length) {
        newNodes.push({ type: 'text', value: node.value.slice(lastIndex) })
      }

      if (newNodes.length > 0 && typeof index === 'number') {
        parent.children?.splice(index, 1, ...newNodes)
      }
    })
  }

  return transformer
})

/**
 * The spoiler plugin bundle: schema attrs, node schema, the `||…||` input rule,
 * the insert command and the remark round-trip. Pure — no adapter needed.
 */
export const createSpoilerPlugin = (): MilkdownPlugin[] =>
  [
    spoilerAttr,
    spoilerSchema,
    insertSpoilerInputRule,
    insertKunSpoilerCommand,
    remarkSpoilerPlugin
  ].flat()
