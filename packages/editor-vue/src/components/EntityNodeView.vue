<script setup lang="ts">
// The node view for both entity nodes — a block card and an inline chip. It
// renders the HOST's component (`<KunEditor :entity-view>`) inside the node's
// own element, which carries the class hooks and `contenteditable="false"`
// (see MilkdownEditor's `as`). Nothing else wraps the host component: it
// reserves its own final size, so a preview resolving late moves nothing.
//
// Non-navigating, like the mention span: a click inside selects the node (the
// mousedown still reaches ProseMirror) but never follows a link the component
// renders, and nothing in it can be dragged out as a stray link.
import type { EntityRef } from '@kungal/editor-core'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import { computed, inject, onMounted, ref, watch } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'

const { node, selected } = useNodeViewContext()
const ctx = inject(KUN_EDITOR_CONTEXT)

const isCard = computed(() => node.value.type.name === 'entity_card')
const entity = computed<EntityRef>(() => ({
  type: String(node.value.attrs.type),
  id: String(node.value.attrs.id),
  url: String(node.value.attrs.url)
}))
const component = computed(() =>
  isCard.value ? ctx?.entityView.card : ctx?.entityView.chip
)

// The focus ring lives on the node's own element (the reference stylesheet
// draws it as an outline, which takes no space).
const rootRef = ref<HTMLElement | null>(null)
const syncSelected = () => {
  const host = rootRef.value?.parentElement
  if (host) {
    host.toggleAttribute('data-selected', selected.value)
  }
}
onMounted(syncSelected)
watch(selected, syncSelected)

const stayPut = (event: Event) => {
  if ((event.target as Element | null)?.closest?.('a, area')) {
    event.preventDefault()
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
    <component
      :is="component"
      v-if="component"
      :entity="entity"
      :selected="selected"
    />
    <span v-else class="kun-entity__fallback">{{ entity.url }}</span>
  </component>
</template>
