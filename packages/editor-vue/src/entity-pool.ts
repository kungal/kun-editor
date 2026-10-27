// Keeps the HOST's entity components mounted while ProseMirror shuffles node
// views around.
//
// ProseMirror reuses a node view only when its diff finds the node close by in
// the same place; a card moved DOWN past a sibling (a drop, Alt+↓), an undo, a
// redo all destroy the node view and make a new one. A host card that fetches
// its preview would remount, refetch, and flash. So the host components do
// not live in the node views: each lives in a slot of this pool — rendered by
// <EntityViewPool> through a Teleport into a detached container element — and
// a node view only ADOPTS a slot's container (appends it). When a node view
// goes away its slot is released, not unmounted; the next node view for the
// same entity, same display, reclaims it — still mounted, preview and all.
// A slot nobody reclaims within RELEASE_MS is unmounted for good.
import type { EntityRef } from '@kungal/editor-core'
import { markRaw, reactive, shallowReactive } from 'vue'

export interface EntitySlot {
  readonly id: number
  readonly key: string
  readonly display: 'card' | 'chip'
  readonly container: HTMLElement
  entity: EntityRef
  selected: boolean
  held: boolean
}

export interface EntityPool {
  /** The live slots, for <EntityViewPool> to render. */
  readonly slots: EntitySlot[]
  /** A slot for `entity` shown as `display` — a released one when there is
   * one (its component still mounted), else a new one. */
  claim(entity: EntityRef, display: 'card' | 'chip'): EntitySlot
  /** Hand a slot back; it is unmounted only if nobody reclaims it soon. */
  release(slot: EntitySlot): void
}

/** How long a released slot waits to be reclaimed — long enough for a node
 * view recreated in the same update, or a quick undo / redo. */
export const RELEASE_MS = 500

const keyOf = (entity: EntityRef, display: string) =>
  `${display}\u0000${entity.type}\u0000${entity.id}\u0000${entity.url}`

export const createEntityPool = (): EntityPool => {
  const slots = shallowReactive<EntitySlot[]>([])
  const timers = new Map<EntitySlot, ReturnType<typeof setTimeout>>()
  let seq = 0

  const claim: EntityPool['claim'] = (entity, display) => {
    const key = keyOf(entity, display)
    const free = slots.find((slot) => slot.key === key && !slot.held)
    if (free) {
      clearTimeout(timers.get(free))
      timers.delete(free)
      free.held = true
      return free
    }
    const container = document.createElement(display === 'card' ? 'div' : 'span')
    container.className = 'kun-entity__host'
    const slot = reactive({
      id: (seq += 1),
      key,
      display,
      container: markRaw(container),
      entity: { ...entity },
      selected: false,
      held: true
    }) as EntitySlot
    slots.push(slot)
    return slot
  }

  const release: EntityPool['release'] = (slot) => {
    slot.held = false
    slot.selected = false
    clearTimeout(timers.get(slot))
    timers.set(
      slot,
      setTimeout(() => {
        timers.delete(slot)
        if (!slot.held) {
          const index = slots.indexOf(slot)
          if (index >= 0) slots.splice(index, 1)
          slot.container.remove()
        }
      }, RELEASE_MS)
    )
  }

  return { slots, claim, release }
}
