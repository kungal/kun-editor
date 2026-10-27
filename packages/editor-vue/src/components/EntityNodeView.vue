<script setup lang="ts">
// The node view for both entity nodes — a block card and an inline chip. The
// node's own element (see MilkdownEditor's `as`) carries the class hooks and
// `contenteditable="false"`; inside it, the HOST's component — which does NOT
// live here: it lives in the entity pool (../entity-pool) and this view only
// adopts its container. So when ProseMirror recreates this view (a card moved
// down, an undo), the host component stays mounted, preview and all. Nothing
// else wraps it: it reserves its own size, so a preview resolving late moves
// nothing.
//
// Non-navigating, like the mention span: a click inside selects the node (the
// mousedown still reaches ProseMirror) but never follows a link the component
// renders, and nothing in it can be dragged out as a stray link.
//
// A card also gets a grip handle at its left edge (shown on hover / when
// selected): drag it to move the card — see ../entity-drag.
import type { EntityRef } from '@kungal/editor-core'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import { startCardDrag } from '../entity-drag'
import type { EntitySlot } from '../entity-pool'
import { entityLabels } from '../entity-shared'

const { node, selected, view, getPos } = useNodeViewContext()
const ctx = inject(KUN_EDITOR_CONTEXT)
const t = computed(() => entityLabels(ctx?.locale))

const isCard = computed(() => node.value.type.name === 'entity_card')
const entity = computed<EntityRef>(() => ({
  type: String(node.value.attrs.type),
  id: String(node.value.attrs.id),
  url: String(node.value.attrs.url)
}))
const hasComponent = computed(
  () => !!(isCard.value ? ctx?.entityView.card : ctx?.entityView.chip)
)

const rootRef = ref<HTMLElement | null>(null)
const hostRef = ref<HTMLElement | null>(null)
let slot: EntitySlot | null = null

const release = () => {
  if (slot) {
    ctx?.entityPool.release(slot)
    slot = null
  }
}
/**
 * Chrome quirk: when the host component's DOM lands inside this (non-editable)
 * node AFTER the editor placed the caret beside it — the pooled component
 * mounts a tick later — Chrome keeps reporting the caret where it was, yet
 * stops treating it as editable: keystrokes insert nothing until the caret is
 * set again. (Seen after a host prompt inserted a card and gave focus back.)
 * Setting the very same range again restores it; ProseMirror sees no change.
 */
const reassertCaret = () => {
  const dom = view.dom
  const selection = dom.ownerDocument.getSelection()
  // A caret only: re-adding a range would lose a backward selection's direction.
  if (!view.hasFocus() || !selection?.rangeCount || !selection.isCollapsed) return
  const range = selection.getRangeAt(0)
  if (!dom.contains(range.startContainer) || rootRef.value?.contains(range.startContainer)) {
    return
  }
  selection.removeAllRanges()
  selection.addRange(range)
}

const adopt = () => {
  release()
  const pool = ctx?.entityPool
  if (!pool || !hasComponent.value || !hostRef.value) return
  slot = pool.claim(entity.value, isCard.value ? 'card' : 'chip')
  slot.selected = selected.value
  hostRef.value.appendChild(slot.container)
  // After the pool has rendered the component into the container.
  requestAnimationFrame(reassertCaret)
}

// The focus ring lives on the node's own element (an outline: no space).
const syncSelected = () => {
  rootRef.value?.parentElement?.toggleAttribute('data-selected', selected.value)
  if (slot) slot.selected = selected.value
}

onMounted(() => {
  adopt()
  syncSelected()
})
watch(selected, syncSelected)
watch(() => `${entity.value.type}\u0000${entity.value.id}\u0000${entity.value.url}`, adopt)
onBeforeUnmount(release)

const stayPut = (event: Event) => {
  if ((event.target as Element | null)?.closest?.('a, area')) {
    event.preventDefault()
  }
}

const onHandleDown = (event: PointerEvent) => {
  const card = rootRef.value?.parentElement
  if (card) {
    startCardDrag(view, getPos, card, event.currentTarget as HTMLElement, event)
  }
}
</script>

<template>
  <!-- `display: contents` (reference stylesheet): a hook, not a box. -->
  <component
    :is="isCard ? 'div' : 'span'"
    ref="rootRef"
    class="kun-entity__body"
    @click.capture="stayPut"
    @auxclick.capture="stayPut"
    @dragstart.capture.prevent
  >
    <span
      v-if="isCard && view.editable"
      class="kun-entity__handle"
      :title="t.drag"
      aria-hidden="true"
      @pointerdown="onHandleDown"
    >
      <svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor">
        <circle cx="2.5" cy="3" r="1.4" /><circle cx="7.5" cy="3" r="1.4" />
        <circle cx="2.5" cy="8" r="1.4" /><circle cx="7.5" cy="8" r="1.4" />
        <circle cx="2.5" cy="13" r="1.4" /><circle cx="7.5" cy="13" r="1.4" />
      </svg>
    </span>
    <component :is="isCard ? 'div' : 'span'" v-if="hasComponent" ref="hostRef" class="kun-entity__slot" />
    <span v-else class="kun-entity__fallback">{{ entity.url }}</span>
  </component>
</template>
