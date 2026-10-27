<script setup lang="ts">
// The entity picker panel — type tabs, a search box, results — for toolbars
// (phone users have no `/` habit). A standalone component over the adapters, so
// both the headless toolbar and @kungal/editor-nuxt's KunUI toolbar (which only
// sees the #toolbar slot API) can wrap it; it emits the picked hit and the
// wrapper inserts it (`insertEntity`). Exported as `KunEntityPicker`.
//
// The input is a combobox: ↑/↓ move through the results, Enter picks, Esc asks
// the wrapper to close. Same debounced, abortable search as the `/` menu.
import type {
  EntityHit,
  KunEditorAdapters,
  KunEditorLocale
} from '@kungal/editor-core'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { entityDomId, entityLabels, useEntitySearch } from '../entity-shared'

const props = defineProps<{
  adapters: KunEditorAdapters
  locale?: KunEditorLocale
}>()
const emit = defineEmits<{
  pick: [hit: EntityHit]
  close: []
}>()

const t = computed(() => entityLabels(props.locale))
const types = computed(() => props.adapters.entityTypes ?? [])
const type = ref(types.value[0]?.type ?? '')
const query = ref('')
const active = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const listId = entityDomId('kun-entity-picker')
const { results, loading, failed, search } = useEntitySearch(() => props.adapters)

const label = computed(
  () => types.value.find((item) => item.type === type.value)?.label ?? ''
)

watch([type, query], () => {
  active.value = 0
  search(type.value, query.value)
})

const selectType = async (next: string) => {
  type.value = next
  await nextTick()
  inputRef.value?.focus()
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.isComposing || event.keyCode === 229) {
    return
  }
  const count = results.value.length
  if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && count) {
    event.preventDefault()
    active.value =
      (active.value + (event.key === 'ArrowDown' ? 1 : count - 1)) % count
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const hit = results.value[active.value]
    if (hit) emit('pick', hit)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
  }
}

onMounted(() => inputRef.value?.focus())
defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<template>
  <div class="kun-entity-picker">
    <div
      v-if="types.length > 1"
      class="kun-entity-picker__types"
      role="tablist"
      :aria-label="t.types"
    >
      <button
        v-for="item in types"
        :key="item.type"
        type="button"
        role="tab"
        class="kun-entity-picker__type"
        :aria-selected="item.type === type"
        :data-active="item.type === type"
        @click="selectType(item.type)"
      >
        {{ item.label }}
      </button>
    </div>
    <input
      ref="inputRef"
      v-model="query"
      type="search"
      class="kun-entity-picker__input"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="results.length > 0"
      :aria-controls="listId"
      :aria-activedescendant="results.length ? `${listId}-${active}` : undefined"
      :placeholder="t.search(label)"
      :aria-label="t.search(label)"
      autocomplete="off"
      spellcheck="false"
      enterkeyhint="search"
      @keydown="onKeydown"
    />
    <div
      :id="listId"
      role="listbox"
      class="kun-entity-picker__list"
      :aria-label="t.search(label)"
      :aria-busy="loading ? 'true' : undefined"
    >
      <div
        v-for="(hit, index) in results"
        :id="`${listId}-${index}`"
        :key="`${hit.ref.type}:${hit.ref.id}`"
        role="option"
        class="kun-entity-picker__option"
        :aria-selected="index === active"
        :data-active="index === active"
        @mousedown.prevent
        @click="emit('pick', hit)"
        @mouseenter="active = index"
      >
        <img
          v-if="hit.thumbnail"
          class="kun-entity-picker__thumb"
          :src="hit.thumbnail"
          alt=""
          loading="lazy"
          draggable="false"
        />
        <span class="kun-entity-picker__text">
          <span class="kun-entity-picker__label">{{ hit.title }}</span>
          <span v-if="hit.subtitle" class="kun-entity-picker__sub">{{ hit.subtitle }}</span>
        </span>
      </div>
    </div>
    <div v-if="!results.length" class="kun-entity-picker__hint" aria-live="polite">
      {{ loading ? t.searching : failed ? t.failed : query.trim() ? t.empty : t.prompt }}
    </div>
  </div>
</template>
