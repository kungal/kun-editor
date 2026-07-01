// @mention plugin — the inline mention atom + its markdown round-trip.
//
// Ported from the forum's plugins/mention/mentionPlugin.ts. Stored markdown form:
// `[@name](kungal-user:<id>)` — an ordinary markdown link whose custom
// `kungal-user:` scheme the server renders into a mention chip (and parses for
// notifications). In the editor it becomes a `mention` inline ATOM carrying the
// user id (stable identity) plus a display-name snapshot.
//
// A markdown link is a MARK (not a node) in milkdown, so a node schema that
// matched links would fight the commonmark link mark. Instead — like spoiler — a
// $remark transformer rewrites the matching link mdast nodes into a custom
// `mention` node on PARSE, so the schema only matches its own type. Serialize
// emits a plain link mdast node back ($remark transformers run on parse only).
//
// This is the CORE mechanism. The `@` autocomplete DROPDOWN (which consumes the
// `searchMentionUsers` adapter, debounces, and inserts a node) is a render-layer
// view (P3) — it just needs this schema + the insert command below.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import type { Node } from '@milkdown/kit/transformer'
import { $command, $nodeSchema, $remark } from '@milkdown/kit/utils'
import { visit } from 'unist-util-visit'
import type { Node as UnistNode } from 'unist'

import { MENTION_SCHEME } from '../../index'

export const mentionId = 'mention'

// Minimal shape of the mdast nodes we touch (link on the way in, our synthetic
// `mention` node on the way out).
interface MdastNode extends Node {
  type: string
  url?: string
  value?: string
  userId?: number
  name?: string
  children?: MdastNode[]
}

export const mentionSchema = $nodeSchema(mentionId, () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: {
    userId: { default: 0 },
    name: { default: '' }
  },
  parseDOM: [
    {
      // Pasted rendered content (server emits <a class="kun-mention" data-uid>).
      tag: 'a.kun-mention',
      getAttrs: (dom) => {
        const el = dom as HTMLElement
        return {
          userId: Number.parseInt(el.dataset.uid ?? '0', 10) || 0,
          name: (el.textContent ?? '').replace(/^@/, '')
        }
      }
    }
  ],
  toDOM: (node) => {
    // A non-navigating span chip inside the editor (a real <a> would steal the
    // click and leave the page mid-compose). data-uid mirrors the server form.
    const span = document.createElement('span')
    span.className = 'kun-mention'
    span.dataset.uid = String(node.attrs.userId)
    span.setAttribute('contenteditable', 'false')
    span.textContent = `@${node.attrs.name}`
    return span
  },
  parseMarkdown: {
    match: (node) => node.type === mentionId,
    runner: (state, node, type) => {
      const n = node as MdastNode
      state.addNode(type, { userId: n.userId ?? 0, name: n.name ?? '' })
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === mentionId,
    runner: (state, node) => {
      state.openNode('link', undefined, {
        url: `${MENTION_SCHEME}${node.attrs.userId}`
      })
      state.addNode('text', undefined, `@${node.attrs.name}`)
      state.closeNode()
    }
  }
}))

/** Rewrites `[@name](kungal-user:id)` links into mention nodes on parse. */
export const remarkMentionPlugin = $remark('remarkMention', () => () => {
  const transformer = (tree: UnistNode) => {
    visit(tree, 'link', (node: MdastNode, index, parent: MdastNode) => {
      if (
        typeof node.url !== 'string' ||
        !node.url.startsWith(MENTION_SCHEME)
      ) {
        return
      }
      const userId = Number.parseInt(node.url.slice(MENTION_SCHEME.length), 10)
      if (!Number.isInteger(userId) || userId <= 0) {
        return
      }
      const first = node.children?.[0]
      const name = (typeof first?.value === 'string' ? first.value : '').replace(
        /^@/,
        ''
      )
      if (typeof index === 'number' && parent.children) {
        parent.children.splice(index, 1, {
          type: mentionId,
          userId,
          name
        } as MdastNode)
      }
    })
  }
  return transformer
})

/**
 * Insert a mention chip at the cursor, replacing the selection. The render-layer
 * dropdown (P3) usually replaces the `@query` range itself; this command is the
 * simple programmatic path (toolbar / tests). A trailing space lets the caret
 * continue past the atom naturally.
 */
export const insertMentionCommand = $command(
  'InsertKunMention',
  (ctx) =>
    (payload?: { userId: number; name: string }) =>
    (state, dispatch) => {
      if (!payload || !dispatch) {
        return false
      }
      const { userId, name } = payload
      if (!Number.isInteger(userId) || userId <= 0) {
        return false
      }
      const node = mentionSchema.type(ctx).create({ userId, name })
      if (!node) {
        return false
      }
      const tr = state.tr.replaceSelectionWith(node)
      tr.insertText(' ')
      dispatch(tr.scrollIntoView())
      return true
    }
)

/** The mention plugin bundle: schema + remark round-trip + insert command. The
 * `searchMentionUsers` adapter is consumed by the render-layer dropdown (P3). */
export const createMentionPlugin = (): MilkdownPlugin[] =>
  [mentionSchema, remarkMentionPlugin, insertMentionCommand].flat()
