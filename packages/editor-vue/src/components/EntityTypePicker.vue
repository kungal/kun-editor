<script setup lang="ts">
// The toolbar's type menu, used when the host owns entity search
// (`entityPrompt`): the same rows as the `/` menu, in a focusable listbox —
// ↑/↓ move, Enter / Space picks, Esc asks the wrapper to close, Home / End
// jump. It emits the picked type; the wrapper closes its popover and calls the
// toolbar API's `promptEntity(type)`. Exported as `KunEntityTypePicker`.
import type { EntityTypeItem, KunEditorLocale } from '@kungal/editor-core'
import { computed, onMounted, ref } from 'vue'
import { entityDomId, entityLabels, filterEntityTypes } from '../entity-shared'
import EntityTypeList from './EntityTypeList.vue'

const props = defineProps<{
  types: EntityTypeItem[]
  locale?: KunEditorLocale
}>()
const emit = defineEmits<{
  pick: [item: EntityTypeItem]
  close: []
}>()

const t = computed(() => entityLabels(props.locale))
const matches = computed(() => filterEntityTypes(props.types, ''))
const active = ref(0)
const listRef = ref<{ $el: HTMLElement } | null>(null)
const focusList = () => listRef.value?.$el.focus({ preventScroll: true })
const listId = entityDomId('kun-entity-type-picker')

const pick = (index: number) => {
  const match = matches.value[index]
  if (match) {
    emit('pick', match.item)
  }
}

const onKeydown = (event: KeyboardEvent) => {
  const n = matches.value.length
  if (!n) {
    return
  }
  const moves: Record<string, () => number> = {
    ArrowDown: () => (active.value + 1) % n,
    ArrowUp: () => (active.value + n - 1) % n,
    Home: () => 0,
    End: () => n - 1
  }
  const move = moves[event.key]
  if (move) {
    event.preventDefault()
    active.value = move()
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    pick(active.value)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
  }
}

onMounted(focusList)
defineExpose({ focus: focusList })
</script>

<template>
  <!-- The listbox itself takes focus (attrs fall through to its root), so
       `aria-activedescendant` sits on the element that owns the options. -->
  <EntityTypeList
    ref="listRef"
    class="kun-entity-type-picker"
    tabindex="0"
    :aria-activedescendant="matches.length ? `${listId}-${active}` : undefined"
    :matches="matches"
    :active="active"
    :id-base="listId"
    :label="t.insert"
    :empty-label="t.noTypes"
    @keydown="onKeydown"
    @pick="pick"
    @hover="active = $event"
  />
</template>
