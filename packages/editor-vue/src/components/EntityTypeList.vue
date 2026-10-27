<script setup lang="ts">
// The entity-type rows — shared by the `/` menu and the toolbar's type menu so
// they look and behave as one thing: a 20px icon, the label (the typed query
// highlighted), the description in muted smaller text under it, and `/command`
// right-aligned in muted monospace. Hover and the keyboard share ONE active
// row, kept scrolled into view.
//
// A `role="listbox"`; whoever owns focus (the editor, or the toolbar menu)
// points `aria-activedescendant` at `optionId(active)`.
import { nextTick, ref, watch } from 'vue'
import type { EntityTypeMatch } from '../entity-shared'
import { splitMatch } from '../entity-shared'
import EntityIcon from './EntityIcon.vue'

const props = defineProps<{
  matches: EntityTypeMatch[]
  active: number
  /** Prefix for the option ids (`${idBase}-${index}`). */
  idBase: string
  label: string
  emptyLabel: string
}>()
const emit = defineEmits<{
  pick: [index: number]
  hover: [index: number]
}>()

const listRef = ref<HTMLElement | null>(null)
watch(
  () => [props.active, props.matches] as const,
  async () => {
    await nextTick()
    const row = listRef.value?.querySelector<HTMLElement>(
      `[data-index="${props.active}"]`
    )
    row?.scrollIntoView({ block: 'nearest' })
  }
)
</script>

<template>
  <div
    :id="idBase"
    ref="listRef"
    role="listbox"
    class="kun-entity-types"
    :aria-label="label"
  >
    <div
      v-for="(match, index) in matches"
      :id="`${idBase}-${index}`"
      :key="match.item.type"
      role="option"
      class="kun-entity-types__row"
      :data-index="index"
      :data-active="index === active"
      :aria-selected="index === active"
      @mousedown.prevent="emit('pick', index)"
      @mousemove="index !== active && emit('hover', index)"
    >
      <EntityIcon :icon="match.item.icon" :label="match.item.label" />
      <span class="kun-entity-types__text">
        <span class="kun-entity-types__title">
          <template v-for="(part, i) in splitMatch(match.item.label, match.label)" :key="i">
            <mark v-if="part.hit" class="kun-entity-types__hit">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>
        <span v-if="match.item.description" class="kun-entity-types__desc">
          {{ match.item.description }}
        </span>
      </span>
      <span v-if="match.item.command" class="kun-entity-types__command">
        /<template v-for="(part, i) in splitMatch(match.item.command, match.command)" :key="i">
          <mark v-if="part.hit" class="kun-entity-types__hit">{{ part.text }}</mark>
          <template v-else>{{ part.text }}</template>
        </template>
      </span>
    </div>
    <div v-if="!matches.length" class="kun-entity-types__empty" role="presentation">
      {{ emptyLabel }}
    </div>
  </div>
</template>
