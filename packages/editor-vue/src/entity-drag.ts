// Moving cards, Notion-style — the drag from a card's grip handle, and the
// FLIP animation it shares with Alt+↑ / Alt+↓.
//
// - Drag: the handle starts it (a mouse after a few pixels of movement, a
//   finger after a long press — a tap only selects the card). A translucent,
//   slightly scaled ghost of the card follows the pointer; a drop line slides
//   between the blocks of the card's container; Esc cancels; the drop is one
//   transaction (`moveEntityCardTo`), so one undo. Nothing in the document
//   changes until the drop, so the host's card is never remounted mid-drag —
//   and the entity pool keeps it mounted across the drop as well.
// - FLIP: the card and every sibling it displaced glide from where they were
//   to where they are (~180ms). Under `prefers-reduced-motion` nothing
//   animates: the ghost does not scale, the line does not slide, blocks jump.
import { moveEntityCardTo } from '@kungal/editor-core/preset'
import { NodeSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

const FLIP_MS = 180
const EASE_OUT = 'cubic-bezier(0.2, 0, 0, 1)'
/** Mouse movement before a press on the handle becomes a drag. */
const DRAG_SLOP = 4
/** Touch: hold this long on the handle to pick the card up. */
const LONG_PRESS_MS = 300
/** Auto-scroll when the pointer is this close to the top / bottom edge. */
const EDGE = 48

interface Block {
  pos: number
  el: HTMLElement | null
}

/** The blocks of the container the card at `pos` sits in, in order. */
const blocksAround = (view: EditorView, pos: number): Block[] => {
  const $pos = view.state.doc.resolve(pos)
  const start = $pos.start()
  const out: Block[] = []
  $pos.parent.forEach((_node, offset) => {
    const at = start + offset
    out.push({ pos: at, el: view.nodeDOM(at) as HTMLElement | null })
  })
  return out
}

/**
 * Run `move` — it dispatches a card move and returns the card's new position,
 * or null — and animate the card and the blocks it displaced from where they
 * were (FLIP). `from` is where the card should appear to come from (the drag
 * ghost); by default its own old place.
 */
export const flipMove = (
  view: EditorView,
  cardPos: number,
  move: () => number | null,
  from?: DOMRect
): number | null => {
  const before = new Map<HTMLElement, DOMRect>()
  for (const block of blocksAround(view, cardPos)) {
    if (block.el) before.set(block.el, block.el.getBoundingClientRect())
  }
  const cardFrom =
    from ?? (view.nodeDOM(cardPos) as HTMLElement | null)?.getBoundingClientRect()
  const at = move()
  if (at === null || prefersReducedMotion()) {
    return at
  }
  for (const block of blocksAround(view, at)) {
    const old = block.pos === at ? cardFrom : block.el && before.get(block.el)
    if (!block.el || !old) continue
    const now = block.el.getBoundingClientRect()
    const dx = old.left - now.left
    const dy = old.top - now.top
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
    block.el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
      { duration: FLIP_MS, easing: EASE_OUT }
    )
  }
  return at
}

/** Move the card at `pos` before child `slot` of its container, animated. */
const dropCard = (view: EditorView, pos: number, slot: number, from?: DOMRect) =>
  flipMove(
    view,
    pos,
    () => {
      const tr = view.state.tr
      const at = moveEntityCardTo(tr, pos, slot)
      if (at !== null) view.dispatch(tr)
      return at
    },
    from
  )

/**
 * Start what a press on a card's grip handle may become: a drag (see the
 * header), or — released without moving — a click that selects the card.
 * `getPos` is the node view's; `card` its element.
 */
export const startCardDrag = (
  view: EditorView,
  getPos: () => number | undefined,
  card: HTMLElement,
  handle: HTMLElement,
  down: PointerEvent
): void => {
  if (!view.editable || down.button > 0) {
    return
  }
  down.preventDefault()
  down.stopPropagation()
  const touch = down.pointerType === 'touch'
  const reduced = prefersReducedMotion()
  handle.setPointerCapture?.(down.pointerId)

  let dragging = false
  let pressTimer: ReturnType<typeof setTimeout> | null = null
  let ghost: HTMLElement | null = null
  let line: HTMLElement | null = null
  let slots: number[] = []
  let bounds = { left: 0, width: 0 }
  let slot = -1
  let index = -1
  let x = down.clientX
  let y = down.clientY
  let grab = { x: 0, y: 0 }
  let scrollFrame = 0

  const select = () => {
    const pos = getPos()
    if (pos === undefined) return
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)))
    view.focus()
  }

  /** Slot y positions (viewport): before each block, and after the last. */
  const measure = () => {
    const pos = getPos()
    if (pos === undefined) return
    const blocks = blocksAround(view, pos)
    index = blocks.findIndex((block) => block.pos === pos)
    const rects = blocks.map((block) => block.el?.getBoundingClientRect() ?? null)
    const real = rects.filter((rect): rect is DOMRect => !!rect)
    if (!real.length) return
    const left = Math.min(...real.map((rect) => rect.left))
    bounds = { left, width: Math.max(...real.map((rect) => rect.right)) - left }
    slots = rects.map((rect, i) => {
      const prev = rects[i - 1]
      if (!rect) return NaN
      return prev ? (prev.bottom + rect.top) / 2 : rect.top
    })
    const last = rects[rects.length - 1]
    slots.push(last ? last.bottom : NaN)
  }

  const place = () => {
    if (!ghost || !line) return
    ghost.style.transform = `translate(${x - grab.x}px, ${y - grab.y}px)${reduced ? '' : ' scale(0.98)'}`
    let best = -1
    let distance = Infinity
    slots.forEach((slotY, i) => {
      const d = Math.abs(slotY - y)
      if (d < distance) {
        distance = d
        best = i
      }
    })
    if (best < 0) return
    const noop = best === index || best === index + 1
    line.dataset.noop = String(noop)
    line.style.left = `${bounds.left}px`
    line.style.width = `${bounds.width}px`
    line.style.transform = `translateY(${slots[best]! - 1}px)`
    if (slot < 0) {
      // First placement: appear in place, then slide from slot to slot.
      void line.offsetWidth
      line.dataset.placed = 'true'
    }
    slot = best
  }

  const autoScroll = () => {
    scrollFrame = 0
    if (!dragging) return
    const speed = y < EDGE ? -(EDGE - y) / 3 : y > innerHeight - EDGE ? (y - innerHeight + EDGE) / 3 : 0
    if (!speed) return
    window.scrollBy(0, speed)
    measure()
    place()
    scrollFrame = requestAnimationFrame(autoScroll)
  }

  const begin = () => {
    if (dragging) return
    const pos = getPos()
    if (pos === undefined) return
    dragging = true
    select()
    const rect = card.getBoundingClientRect()
    grab = { x: x - rect.left, y: y - rect.top }
    ghost = card.cloneNode(true) as HTMLElement
    ghost.removeAttribute('data-selected')
    ghost.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
    ghost.classList.add('kun-entity-ghost')
    ghost.setAttribute('aria-hidden', 'true')
    Object.assign(ghost.style, { width: `${rect.width}px`, height: `${rect.height}px` })
    document.body.appendChild(ghost)
    line = document.createElement('div')
    line.className = 'kun-entity-drop'
    line.setAttribute('aria-hidden', 'true')
    document.body.appendChild(line)
    card.dataset.dragging = 'true'
    document.documentElement.classList.add('kun-entity-dragging')
    measure()
    place()
  }

  const cleanup = () => {
    if (pressTimer) clearTimeout(pressTimer)
    if (scrollFrame) cancelAnimationFrame(scrollFrame)
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onUp)
    handle.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('scroll', onScroll, true)
    if (handle.hasPointerCapture?.(down.pointerId)) {
      handle.releasePointerCapture(down.pointerId)
    }
    ghost?.remove()
    line?.remove()
    delete card.dataset.dragging
    document.documentElement.classList.remove('kun-entity-dragging')
  }

  const onMove = (event: PointerEvent) => {
    x = event.clientX
    y = event.clientY
    const moved = Math.hypot(x - down.clientX, y - down.clientY)
    if (!dragging) {
      if (touch) {
        // A finger that wanders before the long press was not holding.
        if (moved > 8 && pressTimer) {
          clearTimeout(pressTimer)
          pressTimer = null
        }
        return
      }
      if (moved < DRAG_SLOP) return
      begin()
    }
    event.preventDefault()
    place()
    if (!scrollFrame && (y < EDGE || y > innerHeight - EDGE)) {
      scrollFrame = requestAnimationFrame(autoScroll)
    }
  }

  const onUp = () => {
    const wasDragging = dragging
    const from = ghost?.getBoundingClientRect()
    const target = slot
    cleanup()
    dragging = false
    if (!wasDragging) {
      select()
      return
    }
    const pos = getPos()
    if (pos !== undefined && target >= 0) {
      dropCard(view, pos, target, from)
    }
    view.focus()
  }

  const onCancel = () => {
    cleanup()
    dragging = false
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onCancel()
      view.focus()
    }
  }

  const onScroll = () => {
    if (dragging) {
      measure()
      place()
    }
  }

  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onUp)
  handle.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('scroll', onScroll, true)
  if (touch) {
    pressTimer = setTimeout(() => {
      pressTimer = null
      begin()
    }, LONG_PRESS_MS)
  }
}
