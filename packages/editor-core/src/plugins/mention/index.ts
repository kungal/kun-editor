// @mention plugin — the inline mention atom + its markdown round-trip.
//
// The stored markdown form is an ordinary link whose URL the server renders into
// a mention chip (and parses for notifications). The DEFAULT form is
// `[@name](kungal-user:<id>)`, but the URL shape is host POLICY — the KUN server
// uses `kungal-user:`, moyu uses a real `/user/<id>/…` link, another host could
// use something else. So it's injectable via `toUrl` / `fromUrl` (mechanism vs
// policy — see docs/architecture.md); the hardcoded scheme was the one thing
// that stopped a host with a different mention link form from adopting the editor.
//
// A markdown link is a MARK (not a node) in milkdown, so a node schema that
// matched links would fight the commonmark link mark. Instead — like spoiler — a
// $remark transformer rewrites the matching link mdast nodes into a custom
// `mention` node on PARSE; toMarkdown emits a plain link back.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import type { Node } from '@milkdown/kit/transformer'
import { $command, $nodeSchema, $remark } from '@milkdown/kit/utils'
import { visit } from 'unist-util-visit'
import type { Node as UnistNode } from 'unist'

import { MENTION_SCHEME } from '../../index'

export const mentionId = 'mention'

/**
 * How an @mention's user id maps TO / FROM its markdown link URL — host policy.
 * Default: the `kungal-user:<id>` scheme (shared with the KUN server).
 */
export interface MentionUrlConfig {
  /** Build the link URL for a mention of `userId`. */
  toUrl?: (userId: number) => string
  /**
   * Parse a link back to a user id, or `null` if it isn't a mention. Gets the
   * link URL AND its plain text, so a host can replicate text-based guards — e.g.
   * moyu treats `/user/<id>` as a mention only when the link text starts with
   * `@`, so `[see here](/user/5/x)` stays a plain link.
   */
  fromUrl?: (url: string, text: string) => number | null
}

const defaultToUrl = (userId: number): string => `${MENTION_SCHEME}${userId}`
const defaultFromUrl = (url: string): number | null => {
  if (!url.startsWith(MENTION_SCHEME)) return null
  const id = Number.parseInt(url.slice(MENTION_SCHEME.length), 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

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

/** The mention node schema; `toUrl` decides the serialized link URL. */
const makeMentionSchema = (toUrl: (userId: number) => string) =>
  $nodeSchema(mentionId, () => ({
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
        state.openNode('link', undefined, { url: toUrl(node.attrs.userId) })
        state.addNode('text', undefined, `@${node.attrs.name}`)
        state.closeNode()
      }
    }
  }))

/** Rewrites links that `fromUrl` recognizes as mentions into mention nodes. */
const makeRemarkMention = (
  fromUrl: (url: string, text: string) => number | null
) =>
  $remark('remarkMention', () => () => {
    const transformer = (tree: UnistNode) => {
      visit(tree, 'link', (node: MdastNode, index, parent: MdastNode) => {
        if (typeof node.url !== 'string') {
          return
        }
        // The link's plain text, so fromUrl can apply text-based guards (e.g.
        // moyu requires the text to start with `@`). Concatenated across children
        // to be robust to `[**@name**](url)` etc.
        const text = (node.children ?? [])
          .map((child) => (typeof child.value === 'string' ? child.value : ''))
          .join('')
        const userId = fromUrl(node.url, text)
        if (userId == null) {
          return
        }
        const name = text.replace(/^@/, '')
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

/** Default (kungal-user:) mention schema — for advanced direct use. */
export const mentionSchema = makeMentionSchema(defaultToUrl)
/** Default (kungal-user:) mention remark transform — for advanced direct use. */
export const remarkMentionPlugin = makeRemarkMention(defaultFromUrl)

/**
 * Insert a mention chip at the cursor, replacing the selection. The render-layer
 * dropdown usually replaces the `@query` range itself; this is the programmatic
 * path (toolbar / tests / the imperative insertMention handle). A trailing space
 * lets the caret continue past the atom naturally. Resolves the node type by id
 * from the live schema, so it works with any mention config.
 */
export const insertMentionCommand = $command(
  'InsertKunMention',
  () =>
    (payload?: { userId: number; name: string }) =>
    (state, dispatch) => {
      if (!payload || !dispatch) {
        return false
      }
      const { userId, name } = payload
      if (!Number.isInteger(userId) || userId <= 0) {
        return false
      }
      const type = state.schema.nodes[mentionId]
      if (!type) {
        return false
      }
      const node = type.create({ userId, name })
      const tr = state.tr.replaceSelectionWith(node)
      tr.insertText(' ')
      dispatch(tr.scrollIntoView())
      return true
    }
)

/**
 * The mention plugin bundle: schema + remark round-trip + insert command. Pass
 * `toUrl` / `fromUrl` to use a host-specific mention link form; omit for the
 * default `kungal-user:` scheme. The `searchMentionUsers` adapter (the `@`
 * autocomplete) is consumed by the render-layer dropdown.
 */
export const createMentionPlugin = (
  config: MentionUrlConfig = {}
): MilkdownPlugin[] => {
  const schema = config.toUrl ? makeMentionSchema(config.toUrl) : mentionSchema
  const remark = config.fromUrl
    ? makeRemarkMention(config.fromUrl)
    : remarkMentionPlugin
  return [schema, remark, insertMentionCommand].flat()
}
