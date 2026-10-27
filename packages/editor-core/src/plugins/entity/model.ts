// Entity references — the document model: the two nodes, their markdown
// round-trip, and the pure transforms every insertion path shares.
//
// The stored form is plain markdown and the canonical URL IS the reference
// (GitHub-style, so it degrades to a link anywhere). The contract, shared with
// the server renderer:
//
// - A link is an ENTITY link only when it is BARE — its text equals its href
//   (`<https://…>`, a GFM literal `https://…`, or `[u](u)`) — AND the host's
//   `entityFromUrl(href)` recognizes it. `[自定义文字](url)` is an ordinary link.
// - CARD: a paragraph whose only content (ignoring whitespace-only text) is
//   exactly one bare entity link. Any container that holds paragraphs will do
//   (a blockquote, a list item).
// - CHIP: a bare entity link anywhere else inline — mid-sentence, in a heading,
//   in a table cell (a cell holds no paragraph, so never a card there).
// - Both serialize back to the bare canonical URL; mdast-util-to-markdown picks
//   the `<url>` form whenever the URL allows one. A card is that alone in its
//   own paragraph.
//
// Inside an inline spoiler there is nothing to match: the spoiler plugin has
// already turned a bare link inside `||…||` back into its text (a spoiler holds
// plain text), and its remark pass runs before this one.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { nodesCtx } from '@milkdown/kit/core'
import { Fragment } from '@milkdown/kit/prose/model'
import type {
  Mark,
  Node as ProseNode,
  ResolvedPos,
  Schema
} from '@milkdown/kit/prose/model'
import { closeHistory } from '@milkdown/kit/prose/history'
import { NodeSelection, TextSelection } from '@milkdown/kit/prose/state'
import type { Transaction } from '@milkdown/kit/prose/state'
import type { Node } from '@milkdown/kit/transformer'
import { $nodeSchema, $remark } from '@milkdown/kit/utils'
import { SKIP, visit } from 'unist-util-visit'
import type { Node as UnistNode } from 'unist'

import type { EntityDisplay, EntityFromUrl, EntityRef } from '../../types'

export const entityCardId = 'entity_card'
export const entityLinkId = 'entity_link'

/** The mdast node types the remark pass writes and the schemas read. */
const MDAST_CARD = 'kunEntityCard'
const MDAST_CHIP = 'kunEntityLink'

/** Where the editor keeps the reference: on the node attrs, and as data-*
 * attributes in HTML (so a copied card pastes back as a card). */
const DATA = {
  display: 'data-kun-entity',
  type: 'data-entity-type',
  id: 'data-entity-id',
  url: 'data-entity-url'
} as const

/** Whitespace, plus the spoiler's caret anchor (U+200B, which `\s` misses). */
const BLANK = /^[\s\u200b]*$/

/** The host's `entityFromUrl`, made safe to call anywhere: a throw or a
 * malformed answer means "not an entity", never a broken parse or paste. */
export const safeEntityResolver =
  (fromUrl: EntityFromUrl) =>
  (url: string): EntityRef | null => {
    try {
      const ref = fromUrl(url)
      if (
        !ref ||
        typeof ref.type !== 'string' ||
        typeof ref.id !== 'string' ||
        typeof ref.url !== 'string' ||
        !ref.url
      ) {
        return null
      }
      return { type: ref.type, id: ref.id, url: ref.url }
    } catch {
      return null
    }
  }

export type EntityResolver = ReturnType<typeof safeEntityResolver>

/** The node attrs for a reference (exactly these three, nothing a host added). */
export const entityAttrs = (ref: EntityRef): EntityRef => ({
  type: ref.type,
  id: ref.id,
  url: ref.url
})

/**
 * The link text "turn into a link" falls back to when the host has no title:
 * the URL without its scheme. It differs from the href, so the result is an
 * ordinary link that stays one. `null` when stripping changes nothing (a
 * scheme-less URL): that text would equal the href — a chip again.
 */
export const entityLinkFallbackText = (url: string): string | null => {
  const text = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  return text && text !== url ? text : null
}

// ── Markdown ────────────────────────────────────────────────────────────────

interface MdastNode extends Node {
  type: string
  url?: string
  value?: string
  alt?: string
  children?: MdastNode[]
  ref?: EntityRef
}

/** A node's plain text, the way mdast-util-to-string reads it. */
const mdastText = (node: MdastNode): string =>
  typeof node.value === 'string'
    ? node.value
    : typeof node.alt === 'string'
      ? node.alt
      : (node.children ?? []).map(mdastText).join('')

/** The reference a BARE entity link points at, or null. */
const bareEntity = (node: MdastNode, resolve: EntityResolver) =>
  node.type === 'link' &&
  typeof node.url === 'string' &&
  node.url &&
  mdastText(node) === node.url
    ? resolve(node.url)
    : null

/** Rewrites bare entity links into card / chip mdast nodes on parse. */
export const makeRemarkEntity = (resolve: EntityResolver) =>
  $remark('remarkKunEntity', () => () => (tree: UnistNode) => {
    // Cards first: a paragraph that is nothing but one bare entity link.
    visit(tree, 'paragraph', (node: MdastNode, index, parent: MdastNode) => {
      const content = (node.children ?? []).filter(
        (child) => !(child.type === 'text' && BLANK.test(child.value ?? ''))
      )
      const ref =
        content.length === 1 && content[0] ? bareEntity(content[0], resolve) : null
      if (!ref || typeof index !== 'number' || !parent?.children) {
        return
      }
      parent.children.splice(index, 1, { type: MDAST_CARD, ref } as MdastNode)
      return SKIP
    })
    // Every other bare entity link is a chip.
    visit(tree, 'link', (node: MdastNode, index, parent: MdastNode) => {
      const ref = bareEntity(node, resolve)
      if (!ref || typeof index !== 'number' || !parent?.children) {
        return
      }
      parent.children.splice(index, 1, { type: MDAST_CHIP, ref } as MdastNode)
      return SKIP
    })
  })

// ── Schema ──────────────────────────────────────────────────────────────────

const refAttrSpec = {
  type: { default: '' },
  id: { default: '' },
  url: { default: '' }
}

const domAttrs = (node: ProseNode, display: 'card' | 'chip') => ({
  [DATA.display]: display,
  [DATA.type]: String(node.attrs.type),
  [DATA.id]: String(node.attrs.id),
  [DATA.url]: String(node.attrs.url),
  class: display === 'card' ? 'kun-entity-card' : 'kun-entity-chip',
  contenteditable: 'false'
})

/** Read a reference back from data-* attributes — through the host resolver,
 * so HTML from elsewhere (another host, a stale copy) is held to this host's
 * policy. Not an entity here → `false`, and the element parses as its text. */
const parseDomRef = (resolve: EntityResolver) => (dom: HTMLElement | string) => {
  if (typeof dom === 'string') {
    return false
  }
  const url = dom.getAttribute(DATA.url)
  const ref = url ? resolve(url) : null
  return ref ? entityAttrs(ref) : false
}

/** The block card. A leaf atom: selected whole, deleted whole. */
export const makeEntityCardSchema = (resolve: EntityResolver) =>
  $nodeSchema(entityCardId, () => ({
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,
    attrs: refAttrSpec,
    leafText: (node) => String(node.attrs.url),
    parseDOM: [
      {
        tag: `div[${DATA.display}="card"]`,
        priority: 60,
        getAttrs: parseDomRef(resolve)
      }
    ],
    // The headless rendering (and the text/html a copy carries): a neutral box
    // showing the URL. The Vue layer swaps in the host's card via a node view.
    toDOM: (node) => ['div', domAttrs(node, 'card'), String(node.attrs.url)],
    parseMarkdown: {
      match: (node) => node.type === MDAST_CARD,
      runner: (state, node, type) => {
        state.addNode(type, entityAttrs((node as MdastNode).ref as EntityRef))
      }
    },
    toMarkdown: {
      match: (node) => node.type.name === entityCardId,
      runner: (state, node) => {
        const url = String(node.attrs.url)
        state.openNode('paragraph')
        state.openNode('link', undefined, { url, title: null })
        state.addNode('text', undefined, url)
        state.closeNode()
        state.closeNode()
      }
    }
  }))

/** The inline chip. An atom like the mention chip: the caret never enters it,
 * Backspace beside it deletes it whole (see the inline-atom plugin). */
export const makeEntityLinkSchema = (resolve: EntityResolver) =>
  $nodeSchema(entityLinkId, () => ({
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,
    attrs: refAttrSpec,
    leafText: (node) => String(node.attrs.url),
    parseDOM: [
      {
        tag: `span[${DATA.display}="chip"]`,
        priority: 60,
        getAttrs: parseDomRef(resolve)
      }
    ],
    toDOM: (node) => ['span', domAttrs(node, 'chip'), String(node.attrs.url)],
    parseMarkdown: {
      match: (node) => node.type === MDAST_CHIP,
      runner: (state, node, type) => {
        state.addNode(type, entityAttrs((node as MdastNode).ref as EntityRef))
      }
    },
    toMarkdown: {
      match: (node) => node.type.name === entityLinkId,
      runner: (state, node) => {
        const url = String(node.attrs.url)
        state.openNode('link', undefined, { url, title: null })
        state.addNode('text', undefined, url)
        state.closeNode()
      }
    }
  }))

/**
 * A card may be the FIRST child of a list item (`- <url>` is a list item whose
 * paragraph is one bare entity link). commonmark's list item is
 * `paragraph block*`, which would refuse it. Rewrites whichever `list_item`
 * spec is registered (gfm's task-list extension replaces commonmark's), so it
 * must be used after both — `createEntityPlugin` is.
 */
export const listItemAcceptsCard: MilkdownPlugin = (ctx) => () => {
  ctx.update(nodesCtx, (nodes) =>
    nodes.map(([id, spec]) =>
      id === 'list_item' &&
      typeof spec.content === 'string' &&
      spec.content.startsWith('paragraph ')
        ? [
            id,
            {
              ...spec,
              content: spec.content.replace(
                /^paragraph /,
                `(paragraph | ${entityCardId}) `
              )
            }
          ]
        : [id, spec]
    )
  )
}

// ── Reading the document ────────────────────────────────────────────────────

/** An entity node in the document. */
export interface EntityAt {
  pos: number
  node: ProseNode
  display: 'card' | 'chip'
  ref: EntityRef
}

/** The entity node starting at `pos`, if there is one. */
export const entityAt = (doc: ProseNode, pos: number): EntityAt | null => {
  if (pos < 0 || pos >= doc.content.size) {
    return null
  }
  const node = doc.nodeAt(pos)
  const name = node?.type.name
  if (!node || (name !== entityCardId && name !== entityLinkId)) {
    return null
  }
  return {
    pos,
    node,
    display: name === entityCardId ? 'card' : 'chip',
    ref: entityAttrs(node.attrs as EntityRef)
  }
}

/** Whether `$pos` sits where an entity can never go: literal text (a code
 * block) or a spoiler (plain text only). */
export const entityForbiddenAt = ($pos: ResolvedPos): boolean => {
  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth)
    if (node.type.spec.code || node.type.name === 'kun-spoiler') {
      return true
    }
  }
  return false
}

/** Whether everything in `block` outside [from, to) (offsets) is blank text.
 * Any inline node there (a hard break, an image, another chip) is content. */
const onlyContent = (block: ProseNode, from: number, to: number): boolean => {
  const OBJECT = '\ufffc'
  const outside =
    block.textBetween(0, from, undefined, OBJECT) +
    block.textBetween(to, block.content.size, undefined, OBJECT)
  return BLANK.test(outside)
}

/** Whether the paragraph that `$inside` sits in may be swapped for a card. */
const paragraphCanBeCard = ($inside: ResolvedPos, schema: Schema): boolean => {
  const card = schema.nodes[entityCardId]
  if (!card || $inside.parent.type.name !== 'paragraph' || $inside.depth < 1) {
    return false
  }
  const index = $inside.index($inside.depth - 1)
  return $inside.node($inside.depth - 1).canReplaceWith(index, index + 1, card)
}

/**
 * What the one rule inserts at `pos`: a card when the paragraph there holds
 * nothing but blank text (and a card may stand there), otherwise a chip. The
 * `/` menu and the host prompt ask this BEFORE inserting, to tell the host
 * what it will get.
 */
export const entityDisplayAt = (
  doc: ProseNode,
  pos: number
): 'card' | 'chip' => {
  const $pos = doc.resolve(pos)
  return $pos.parent.isTextblock &&
    paragraphCanBeCard($pos, doc.type.schema) &&
    onlyContent($pos.parent, 0, 0)
    ? 'card'
    : 'chip'
}

/**
 * Whether showing the entity at `pos` as `display` survives a save. By the
 * contract a bare link that is all its paragraph holds IS a card, so a chip
 * alone in its paragraph (blank text and caret anchors aside) reads back as a
 * card — and a card can therefore never become a chip on its own. A chip with
 * formatting around it (`**<url>**`) is not bare at the paragraph level and
 * stays a chip; so does one in a heading or a table cell.
 */
export const entityDisplayPersists = (
  doc: ProseNode,
  pos: number,
  display: EntityDisplay
): boolean => {
  const entity = entityAt(doc, pos)
  if (!entity || display !== 'chip') {
    return !!entity
  }
  if (entity.display === 'card') {
    return false
  }
  const $pos = doc.resolve(pos)
  return (
    entity.node.marks.length > 0 ||
    $pos.parent.type.name !== 'paragraph' ||
    !onlyContent($pos.parent, $pos.parentOffset, $pos.parentOffset + entity.node.nodeSize)
  )
}

// ── Transforms ──────────────────────────────────────────────────────────────

/** Put the caret in an empty paragraph right after the block ending at `end`,
 * reusing one that is already there. Returns false where no paragraph may go. */
const caretAfterBlock = (tr: Transaction, end: number): boolean => {
  const { paragraph } = tr.doc.type.schema.nodes
  const next = tr.doc.nodeAt(end)
  if (next && next.type === paragraph && next.content.size === 0) {
    tr.setSelection(TextSelection.create(tr.doc, end + 1))
    return true
  }
  const $end = tr.doc.resolve(end)
  if (!paragraph || !$end.parent.canReplaceWith($end.index(), $end.index(), paragraph)) {
    return false
  }
  tr.insert(end, paragraph.create())
  tr.setSelection(TextSelection.create(tr.doc, end + 1))
  return true
}

/** Swap the paragraph starting at `start` for a card. With `caret`, the caret
 * goes to a paragraph after it (reused when empty) — where typing continues. */
const paragraphToCard = (
  tr: Transaction,
  start: number,
  ref: EntityRef,
  caret: boolean
): number => {
  const card = tr.doc.type.schema.nodes[entityCardId]!.create(entityAttrs(ref))
  const paragraph = tr.doc.nodeAt(start)!
  tr.replaceWith(start, start + paragraph.nodeSize, card)
  if (caret && !caretAfterBlock(tr, start + card.nodeSize)) {
    tr.setSelection(NodeSelection.create(tr.doc, start))
  }
  return start
}

/** The marks a chip keeps from the text it replaces: formatting, never the
 * link itself, and only what the block allows. */
const chipMarks = (marks: readonly Mark[], parent: ProseNode): readonly Mark[] =>
  marks.filter(
    (mark) =>
      mark.type.name !== 'link' &&
      !mark.type.spec.code &&
      parent.type.allowsMarkType(mark.type)
  )

/** Put a chip at `pos` (a range already cleared), and give a caret that was
 * there somewhere to stand after it: a chip ending its block gets a trailing
 * space, the same anchor the mention chip gets. */
const insertChip = (
  tr: Transaction,
  pos: number,
  ref: EntityRef,
  marks: readonly Mark[],
  caret: boolean
): number => {
  const $pos = tr.doc.resolve(pos)
  const chip = tr.doc.type.schema.nodes[entityLinkId]!.create(
    entityAttrs(ref),
    null,
    chipMarks(marks, $pos.parent)
  )
  tr.insert(pos, chip)
  const after = pos + chip.nodeSize
  if (caret) {
    const $after = tr.doc.resolve(after)
    const next = $after.nodeAfter
    if (!next || (next.isText && !/^\s/.test(next.text ?? ''))) {
      tr.insertText(' ', after)
      tr.setSelection(TextSelection.create(tr.doc, after + 1))
    } else {
      tr.setSelection(TextSelection.create(tr.doc, after))
    }
  }
  return pos
}

export interface PlaceEntityOptions {
  /** Whether a paragraph that holds nothing but the URL becomes a card. A URL
   * ended by a space stays a chip — the line is still being written. */
  allowCard: boolean
}

/**
 * THE rule every insertion path shares: replace the URL text at `from`–`to`
 * (one text run in one textblock) with the entity — a CARD when it is all the
 * paragraph holds and a card may stand there, else a CHIP. A caret right after
 * the URL (paste, a committed clip) moves past the new node. Returns the
 * node's position, or null where an entity may not go (code, a spoiler).
 */
export const placeEntity = (
  tr: Transaction,
  from: number,
  to: number,
  ref: EntityRef,
  { allowCard }: PlaceEntityOptions
): number | null => {
  const $from = tr.doc.resolve(from)
  const block = $from.parent
  if (
    !block.isTextblock ||
    entityForbiddenAt($from) ||
    tr.doc.resolve(to).parent !== block
  ) {
    return null
  }
  const { selection } = tr
  const caretAtEnd = selection.empty && selection.from === to
  if (
    allowCard &&
    paragraphCanBeCard($from, tr.doc.type.schema) &&
    onlyContent(block, from - $from.start(), to - $from.start())
  ) {
    return paragraphToCard(tr, $from.before(), ref, caretAtEnd)
  }
  const marks = tr.doc.nodeAt(from)?.marks ?? []
  tr.delete(from, to)
  return insertChip(tr, from, ref, marks, caretAtEnd)
}

/**
 * Insert an entity at the selection (the programmatic path: the toolbar
 * picker, `insertEntity`). `card` takes over an empty paragraph, or goes
 * between the halves of a non-empty one; where a card cannot stand (a heading,
 * a table cell) it falls back to a chip. `auto` (the default) is the one rule:
 * a card in an empty paragraph, a chip anywhere else. Returns false inside
 * code / a spoiler.
 */
export const insertEntity = (
  tr: Transaction,
  ref: EntityRef,
  display: 'card' | 'chip' | 'auto' = 'auto'
): boolean => {
  if (!tr.selection.empty) {
    tr.deleteSelection()
  }
  const { $from } = tr.selection
  if (!$from.parent.isTextblock || entityForbiddenAt($from)) {
    return false
  }
  const schema = tr.doc.type.schema
  const card =
    display === 'card' ||
    (display === 'auto' && onlyContent($from.parent, 0, 0))
  if (card && paragraphCanBeCard($from, schema)) {
    const block = $from.parent
    if (onlyContent(block, 0, 0)) {
      paragraphToCard(tr, $from.before(), ref, true)
      return true
    }
    // Split around the caret: the card goes between the two halves, and the
    // caret stays at the start of the second (or right before / after the
    // paragraph when the caret is at one of its ends).
    const card = schema.nodes[entityCardId]!.create(entityAttrs(ref))
    if ($from.parentOffset === 0) {
      tr.insert($from.before(), card)
      return true
    }
    if ($from.parentOffset === block.content.size) {
      const at = $from.after()
      tr.insert(at, card)
      if (!caretAfterBlock(tr, at + card.nodeSize)) {
        tr.setSelection(NodeSelection.create(tr.doc, at))
      }
      return true
    }
    tr.split($from.pos)
    const at = $from.pos + 1
    tr.insert(at, card)
    tr.setSelection(TextSelection.create(tr.doc, at + card.nodeSize + 1))
    return true
  }
  const marks = tr.storedMarks ?? $from.marks()
  insertChip(tr, $from.pos, ref, marks, true)
  return true
}

/**
 * Replace a typed range (the `/query` the slash menu consumed) with an entity:
 * a CARD when that leaves the paragraph empty, otherwise a chip.
 */
export const replaceRangeWithEntity = (
  tr: Transaction,
  from: number,
  to: number,
  ref: EntityRef
): boolean => {
  const $from = tr.doc.resolve(from)
  if (!$from.parent.isTextblock || entityForbiddenAt($from)) {
    return false
  }
  const marks = tr.doc.nodeAt(from)?.marks ?? []
  tr.delete(from, to)
  tr.setSelection(TextSelection.create(tr.doc, from))
  const $at = tr.doc.resolve(from)
  if (
    paragraphCanBeCard($at, tr.doc.type.schema) &&
    onlyContent($at.parent, 0, 0)
  ) {
    paragraphToCard(tr, $at.before(), ref, true)
    return true
  }
  insertChip(tr, from, ref, marks, true)
  return true
}

/** Trim blank text off one end of a fragment (the space beside a chip that is
 * turning into a card would otherwise strand at the end of a line). */
const trimFragment = (fragment: Fragment, side: 'start' | 'end'): Fragment => {
  const nodes: ProseNode[] = []
  fragment.forEach((node) => nodes.push(node))
  const pattern = side === 'start' ? /^[\s\u200b]+/ : /[\s\u200b]+$/
  while (nodes.length) {
    const index = side === 'start' ? 0 : nodes.length - 1
    const node = nodes[index]!
    if (!node.isText) {
      break
    }
    const text = (node.text ?? '').replace(pattern, '')
    if (text) {
      nodes[index] = node.type.schema.text(text, node.marks)
      break
    }
    nodes.splice(index, 1)
  }
  return Fragment.fromArray(nodes)
}

/** Leave the caret right after the entity at `pos`: after a chip, or in an
 * (empty, reused) paragraph after a card — where typing goes on. */
const caretPastEntity = (tr: Transaction, pos: number) => {
  const node = tr.doc.nodeAt(pos)
  if (!node) {
    return
  }
  const end = pos + node.nodeSize
  if (node.isInline) {
    tr.setSelection(TextSelection.create(tr.doc, end))
  } else if (!caretAfterBlock(tr, end)) {
    tr.setSelection(NodeSelection.create(tr.doc, pos))
  }
}

/**
 * Turn the entity at `pos` into another display. `link` needs `text` — the
 * title (or the fallback) for an ordinary `[text](url)` link; a text equal to
 * the URL would be a chip again, so it is refused. Returns false when the
 * conversion is not possible here (a card from a chip in a heading, …).
 *
 * The selection ends ON the converted entity (`select`, so its bubble stays
 * up) or just past it (`after` — the paste popover: the user goes on typing);
 * after a link, always after the link text.
 */
export const setEntityDisplay = (
  tr: Transaction,
  pos: number,
  display: EntityDisplay,
  text?: string,
  caret: 'select' | 'after' = 'select'
): boolean => {
  if (!applyEntityDisplay(tr, pos, display, text)) {
    return false
  }
  if (display !== 'link' && caret === 'after') {
    caretPastEntity(tr, tr.selection.from)
  }
  return true
}

const applyEntityDisplay = (
  tr: Transaction,
  pos: number,
  display: EntityDisplay,
  text?: string
): boolean => {
  const entity = entityAt(tr.doc, pos)
  if (!entity) {
    return false
  }
  const schema = tr.doc.type.schema
  const { node, ref } = entity
  if (display === entity.display) {
    tr.setSelection(NodeSelection.create(tr.doc, pos))
    return true
  }
  if (display === 'link') {
    const link = schema.marks.link
    const label = text?.trim()
    if (!link || !label || label === ref.url) {
      return false
    }
    const marks = link.create({ href: ref.url }).addToSet(node.marks)
    const linked = schema.text(label, marks)
    if (entity.display === 'card') {
      const paragraph = schema.nodes.paragraph!.create(null, linked)
      tr.replaceWith(pos, pos + node.nodeSize, paragraph)
      tr.setSelection(TextSelection.create(tr.doc, pos + 1 + label.length))
    } else {
      tr.replaceWith(pos, pos + node.nodeSize, linked)
      tr.setSelection(TextSelection.create(tr.doc, pos + label.length))
    }
    // The link mark is inclusive: what is typed next must not join it.
    tr.removeStoredMark(link)
    return true
  }
  if (display === 'chip') {
    // card → a paragraph holding just the chip.
    const $pos = tr.doc.resolve(pos)
    const paragraph = schema.nodes.paragraph!
    const chip = schema.nodes[entityLinkId]!.create(entityAttrs(ref))
    if (!$pos.parent.canReplaceWith($pos.index(), $pos.index() + 1, paragraph)) {
      return false
    }
    tr.replaceWith(pos, pos + node.nodeSize, paragraph.create(null, chip))
    tr.setSelection(NodeSelection.create(tr.doc, pos + 1))
    return true
  }
  // chip → card.
  const $pos = tr.doc.resolve(pos)
  if (!paragraphCanBeCard($pos, schema)) {
    return false
  }
  const block = $pos.parent
  const offset = $pos.parentOffset
  const start = $pos.before()
  if (onlyContent(block, offset, offset + node.nodeSize)) {
    paragraphToCard(tr, start, ref, false)
    tr.setSelection(NodeSelection.create(tr.doc, start))
    return true
  }
  // Split the paragraph around the chip: text before / card / text after.
  const before = trimFragment(block.content.cut(0, offset), 'end')
  const after = trimFragment(block.content.cut(offset + node.nodeSize), 'start')
  const card = schema.nodes[entityCardId]!.create(entityAttrs(ref))
  const parts: ProseNode[] = []
  if (before.size) {
    parts.push(block.type.create(block.attrs, before))
  }
  parts.push(card)
  if (after.size) {
    parts.push(block.type.create(block.attrs, after))
  }
  const container = $pos.node($pos.depth - 1)
  const index = $pos.index($pos.depth - 1)
  if (!container.canReplace(index, index + 1, Fragment.fromArray(parts))) {
    return false
  }
  tr.replaceWith(start, start + block.nodeSize, parts)
  const cardPos = start + (before.size ? before.size + 2 : 0)
  tr.setSelection(NodeSelection.create(tr.doc, cardPos))
  return true
}

/**
 * Move the card at `pos` so it sits before its parent's child `slot` (the
 * child indexes of the document as it is now; `childCount` = at the end) —
 * the drop of a drag. Moves stay inside the card's own container, and only
 * where that container's content rules allow the result. Each move is its own
 * undo step, however quickly the next follows. Returns the card's new
 * position (selected), or null when that is no move at all or not allowed.
 */
export const moveEntityCardTo = (
  tr: Transaction,
  pos: number,
  slot: number
): number | null => {
  const entity = entityAt(tr.doc, pos)
  if (!entity || entity.display !== 'card') {
    return null
  }
  const $pos = tr.doc.resolve(pos)
  const parent = $pos.parent
  const index = $pos.index()
  if (slot < 0 || slot > parent.childCount || slot === index || slot === index + 1) {
    return null
  }
  const children: ProseNode[] = []
  parent.forEach((child, _offset, i) => {
    if (i === slot) children.push(entity.node)
    if (i !== index) children.push(child)
  })
  if (slot === parent.childCount) {
    children.push(entity.node)
  }
  if (!parent.type.validContent(Fragment.fromArray(children))) {
    return null
  }
  let target = $pos.start()
  for (let i = 0; i < slot; i++) {
    target += parent.child(i).nodeSize
  }
  closeHistory(tr)
  tr.delete(pos, pos + entity.node.nodeSize)
  const at = tr.mapping.map(target, slot > index ? -1 : 1)
  tr.insert(at, entity.node)
  tr.setSelection(NodeSelection.create(tr.doc, at))
  return at
}

/** Move the card at `pos` past the previous (`-1`) or next (`1`) block of its
 * container — Alt+↑ / Alt+↓. Returns its new position, or null at an end. */
export const moveEntityCard = (
  tr: Transaction,
  pos: number,
  dir: -1 | 1
): number | null => {
  const index = tr.doc.resolve(pos).index()
  return moveEntityCardTo(tr, pos, dir < 0 ? index - 1 : index + 2)
}

/** Delete the entity at `pos` — whole, like Backspace on a selected one. */
export const deleteEntity = (tr: Transaction, pos: number): boolean => {
  if (!entityAt(tr.doc, pos)) {
    return false
  }
  tr.setSelection(NodeSelection.create(tr.doc, pos)).deleteSelection()
  return true
}
