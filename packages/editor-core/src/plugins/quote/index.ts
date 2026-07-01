// Quote / inline-reference plugin — a non-editable inline atom that points at
// something the HOST defines (a reply, a comment, …).
//
// Ported from the forum's plugins/quote/quotePlugin.ts, but GENERALIZED per
// docs/architecture.md § the reply-quote question (option 1): the forum's
// `{ replyId, floor }` becomes an opaque `{ refId, label }`. The editor owns the
// mechanism — a stable inline atom with a trailing-caret insert — while the host
// owns what a reference means (it supplies refId + the display label).
//
// Stored markdown form: `[label](kungal-reply:<refId>)` — an ordinary link whose
// custom `kungal-reply:` scheme the server renders into a quote card. Same shape
// as the mention plugin: a $remark transformer rewrites matching links into a
// `quote` node on PARSE; toMarkdown emits a plain link back.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import type { Node } from '@milkdown/kit/transformer'
import { $command, $nodeSchema, $remark } from '@milkdown/kit/utils'
import { visit } from 'unist-util-visit'
import type { Node as UnistNode } from 'unist'

import { QUOTE_SCHEME } from '../../index'

export const quoteId = 'quote'

/** The payload a host passes to insert a reference. `refId` is opaque (the host
 * decides its meaning); `label` is what the chip shows. */
export interface QuoteReference {
  refId: string
  label: string
}

// Minimal shape of the mdast nodes we touch (link on the way in, our synthetic
// `quote` node on the way out).
interface MdastNode extends Node {
  type: string
  url?: string
  value?: string
  refId?: string
  label?: string
  children?: MdastNode[]
}

export const quoteSchema = $nodeSchema(quoteId, () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: {
    refId: { default: '' },
    label: { default: '' }
  },
  parseDOM: [
    {
      // Pasted rendered content (server emits <span class="kun-quote" data-ref-id>).
      tag: 'span.kun-quote',
      getAttrs: (dom) => {
        const el = dom as HTMLElement
        return {
          refId: el.dataset.refId ?? '',
          label: el.textContent ?? ''
        }
      }
    }
  ],
  toDOM: (node) => {
    // A non-navigating span chip inside the editor; mirrors the server form so a
    // round-trip through paste/copy is lossless.
    const span = document.createElement('span')
    span.className = 'kun-quote'
    span.dataset.refId = String(node.attrs.refId)
    span.setAttribute('contenteditable', 'false')
    span.textContent = String(node.attrs.label)
    return span
  },
  parseMarkdown: {
    match: (node) => node.type === quoteId,
    runner: (state, node, type) => {
      const n = node as MdastNode
      state.addNode(type, { refId: n.refId ?? '', label: n.label ?? '' })
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === quoteId,
    runner: (state, node) => {
      state.openNode('link', undefined, {
        url: `${QUOTE_SCHEME}${node.attrs.refId}`
      })
      state.addNode('text', undefined, String(node.attrs.label))
      state.closeNode()
    }
  }
}))

/** Rewrites `[label](kungal-reply:refId)` links into quote nodes on parse. */
export const remarkQuotePlugin = $remark('remarkQuote', () => () => {
  const transformer = (tree: UnistNode) => {
    visit(tree, 'link', (node: MdastNode, index, parent: MdastNode) => {
      if (typeof node.url !== 'string' || !node.url.startsWith(QUOTE_SCHEME)) {
        return
      }
      const refId = node.url.slice(QUOTE_SCHEME.length)
      if (!refId) {
        return
      }
      const first = node.children?.[0]
      const label = typeof first?.value === 'string' ? first.value : ''
      if (typeof index === 'number' && parent.children) {
        parent.children.splice(index, 1, {
          type: quoteId,
          refId,
          label
        } as MdastNode)
      }
    })
  }
  return transformer
})

/**
 * Insert a quote chip at the cursor, replacing the selection. The host supplies
 * `{ refId, label }`. A trailing space is the whole caret fix: a paragraph that
 * ENDS in a non-editable inline atom has no stable caret position after it, so
 * the next keystroke (esp. an IME composition) snaps to before the atom. A real
 * text node after it gives the caret somewhere to anchor.
 */
export const insertQuoteCommand = $command(
  'InsertKunQuote',
  (ctx) =>
    (payload?: QuoteReference) =>
    (state, dispatch) => {
      if (!payload || !dispatch) {
        return false
      }
      const { refId, label } = payload
      if (!refId) {
        return false
      }
      const node = quoteSchema.type(ctx).create({ refId, label })
      if (!node) {
        return false
      }
      const tr = state.tr.replaceSelectionWith(node)
      tr.insertText(' ')
      dispatch(tr.scrollIntoView())
      return true
    }
)

/** The quote plugin bundle: schema + remark round-trip + insert command. */
export const createQuotePlugin = (): MilkdownPlugin[] =>
  [quoteSchema, remarkQuotePlugin, insertQuoteCommand].flat()
