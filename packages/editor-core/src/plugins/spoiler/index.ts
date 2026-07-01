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
import { expectDomTypeError } from '@milkdown/kit/exception'
import { InputRule } from '@milkdown/kit/prose/inputrules'
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
      state.addNode('text', undefined, '||')
      state.next(node.content)
      state.addNode('text', undefined, '||')
    }
  }
}))

/** Toolbar entry point: wraps the current selection in a spoiler node. The
 * render layer's toolbar calls this via commandsCtx (P3). */
export const insertKunSpoilerCommand = $command(
  'InsertKunSpoiler',
  (ctx) => () => (state, dispatch) => {
    if (!dispatch) {
      return true
    }
    const node = spoilerSchema.type(ctx).create()
    if (!node) {
      return true
    }
    dispatch(state.tr.replaceSelectionWith(node).scrollIntoView())
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
      const zeroWidthSpace = schema.text('​')
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
