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
import { SerializerReady, serializerCtx } from '@milkdown/kit/core'
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

/**
 * DOM attrs for the spoiler chip AS SEEN WHILE EDITING — a tinted chip, so you
 * can tell hidden text from ordinary text while you write it. (The published
 * page renders `||…||` itself; this styling never leaves the editor.)
 *
 * Self-sufficient on purpose: it used to be `background: var(--color-default-500)`
 * with no fallback, so in any host that does not define that palette token — the
 * headless editor being exactly such a host — the whole declaration was invalid
 * and the chip computed to `rgba(0, 0, 0, 0)`. Hidden text looked like plain text.
 *
 * `--kun-spoiler-bg` is the theming hook: an INLINE style beats every selector a
 * host stylesheet can write, so without a custom property the chip would be
 * untouchable from CSS. Setting the property is not (a rule may set it on
 * `.kun-spoiler` freely) — which is how @kungal/editor-nuxt paints it in KunUI
 * colors, and how any host re-tints it in one line.
 *
 * The default is `currentColor`-derived rather than a fixed grey so it works on a
 * light and a dark background alike; the plain rgba before it is what a browser
 * without `color-mix()` keeps (an unknown function is dropped at parse time, so
 * the earlier declaration survives — unlike a bad `var()`, which kills both).
 */
export const spoilerAttr = $nodeAttr('kun-spoiler', () => ({
  container: {
    class: 'kun-spoiler',
    style:
      'background: rgba(127, 127, 127, 0.3);' +
      ' background: var(--kun-spoiler-bg, color-mix(in oklab, currentColor 22%, transparent));' +
      ' border-radius: var(--radius-sm, 0.25rem); padding: 0 4px; cursor: pointer;'
  }
}))

/** The zero-width space this plugin parks the caret on. A caret has to sit in a
 * TEXT node: with nothing after a spoiler the browser puts the next keystroke
 * inside it, and an empty spoiler has nowhere to type at all. Spelled as an
 * escape because the literal character is invisible in a source file.
 *
 * The invariant, held by `stripCaretAnchors` (out) and the remark transform (in):
 * an anchor is an EDITOR device \u2014 it lives in the ProseMirror document, and never
 * in the markdown. It used to ride along into whatever the host stored, so a
 * saved post read `\u9cb2 ||Galgame||<U+200B> \u8bba\u575b`: an invisible character in the
 * database, in every diff, and in every consumer that never heard of this editor. */
const CARET_ANCHOR = '\u200b'

/**
 * Take the anchors back out of every markdown string the editor hands over.
 *
 * At the SERIALIZER, not at one caller: `getMarkdown()`, the listener that backs
 * `v-model`, the source view and any host action all read through this one slice,
 * and only the last of those is ours to police. Wrapping it also covers anchors
 * that arrived from stored content or a paste, so a document heals itself the
 * next time it is saved.
 */
const stripCaretAnchors: MilkdownPlugin = (ctx) => async () => {
  await ctx.wait(SerializerReady)
  ctx.update(
    serializerCtx,
    (serialize) => (doc) => serialize(doc).replaceAll(CARET_ANCHOR, '')
  )
}

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
 *   formatting is what's dropped, never the words. Line breaks become spaces:
 *   `||…||` pairs within one line in every reader of the syntax, so a spoiler
 *   spanning lines would serialize to markdown that reads back as literal `||`.
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
 * code block, with a NODE selected, or over a selection holding no words at all
 * (an image is not text; replacing it would delete it) — so a host can grey the
 * button out. A spoiler holds text, so any other inline node caught in a text
 * selection alongside words (an image, inline math) does not survive the move:
 * `||…||` cannot carry one.
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
    // ' ' for BOTH separators, because `||…||` is line-scoped everywhere it is
    // read — the remark transform below, and the server renderer that shares the
    // syntax — so a spoiler holding a line break would serialize to markdown
    // that reads back as literal `||`. The block separator keeps the words apart
    // when a selection spans paragraphs; the leaf one covers a line break inside
    // one (commonmark's hardbreak declares `leafText: () => '\n'`, so without it
    // the button writes the very cross-line `||` it cannot parse).
    const text = state.doc
      .textBetween(from, to, ' ', ' ')
      .replaceAll(CARET_ANCHOR, '')
    // A selection with no words in it (an image on its own) is nothing to hide,
    // and hiding it would delete it. An EMPTY selection is the other thing
    // entirely: an empty spoiler to type into.
    if (!empty && !text.trim()) {
      return false
    }
    if (!dispatch) {
      return true
    }

    // Empty selection → the node still needs a text node to hold the caret, so
    // it starts on an anchor; the serializer drops it again.
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

      // Anchors that rode in with stored content (this plugin used to write them
      // to markdown) are dropped here and re-added below, so a loaded spoiler
      // ends up with exactly the one the editor needs.
      const value = node.value.replaceAll(CARET_ANCHOR, '')
      const regex = /\|\|(.*?)\|\|/g
      const newNodes: SpoilerNode[] = []
      let lastIndex = 0

      for (const match of value.matchAll(regex)) {
        const [full, content] = match
        const matchIndex = match.index ?? 0

        if (matchIndex > lastIndex) {
          newNodes.push({
            type: 'text',
            value: value.slice(lastIndex, matchIndex)
          })
        }

        if (content) {
          newNodes.push({
            type: 'kun-spoiler',
            children: [{ type: 'text', value: content }]
          })
          // Loading a spoiler has to leave the same caret anchor after it that
          // typing one does — it is what lets you click past a spoiler sitting at
          // the end of a paragraph and type OUTSIDE it. The serializer takes it
          // off again, so it costs the stored markdown nothing.
          newNodes.push({ type: 'text', value: CARET_ANCHOR })
        }

        lastIndex = matchIndex + full.length
      }

      if (lastIndex < value.length) {
        newNodes.push({ type: 'text', value: value.slice(lastIndex) })
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
 * the insert command, the remark round-trip and the serializer guard that keeps
 * caret anchors out of the markdown. Pure — no adapter needed.
 */
export const createSpoilerPlugin = (): MilkdownPlugin[] =>
  [
    spoilerAttr,
    spoilerSchema,
    insertSpoilerInputRule,
    insertKunSpoilerCommand,
    remarkSpoilerPlugin,
    stripCaretAnchors
  ].flat()
