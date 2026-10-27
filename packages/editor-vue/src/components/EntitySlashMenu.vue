<script setup lang="ts">
// The `/` menu — insert an entity reference without leaving the keyboard.
//
// `/` at the start of a paragraph or after whitespace opens it on the host's
// `entityTypes` (host order). The text typed after the `/` filters them; a
// space, or a filter nothing matches, closes it (that `/` was just a slash —
// "a/b", "/usr"). Picking a type (↑/↓ + Enter / Tab, or a click) drops the
// filter text and turns the menu into a search over that type: the query is
// typed IN THE DOCUMENT after the `/` (spaces allowed — titles have them), so
// IME composition works exactly as anywhere else. Results are debounced and
// abortable (see useEntitySearch). Picking a hit replaces `/query` with a
// CARD when that leaves the paragraph empty, a CHIP otherwise.
//
// Esc: on the type list, closes and leaves the `/`; while searching with an
// empty query, removes the `/` trigger — and nothing else — and closes; with a
// query, closes and leaves the text as typed. Backspace on an empty query goes
// back to the type list instead of deleting the `/`.
//
// Focus never leaves the document: the list is `role="listbox"` and the
// editor's `aria-activedescendant` names the highlighted option.
import { usePluginViewContext } from '@prosemirror-adapter/vue'
import { TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { entityForbiddenAt, replaceRangeWithEntity } from '@kungal/editor-core/preset'
import type { EntityHit, EntityTypeItem } from '@kungal/editor-core'
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import {
  entityDomId,
  entityLabels,
  floatNear,
  useEntitySearch
} from '../entity-shared'

const { view, prevState } = usePluginViewContext()
const ctx = inject(KUN_EDITOR_CONTEXT)
const t = computed(() => entityLabels(ctx?.locale))
const types = computed<EntityTypeItem[]>(() => ctx?.adapters.entityTypes ?? [])
const { results, loading, failed, search, clear } = useEntitySearch(
  () => ctx?.adapters ?? {}
)

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)
/** The type being searched; null while the type list shows. */
const picked = ref<EntityTypeItem | null>(null)
/** Text after the `/`: the type filter, or the search query. */
const query = ref('')
const active = ref(0)
/** Document position of the `/`. Valid while the caret stays after it in the
 * same block — every edit then happens at the caret, after it. */
let slashPos = -1
/** A `/` whose menu Esc closed: it stays a plain slash. */
let dismissedSlash = -1
let stopFloating: (() => void) | null = null
const listId = entityDomId('kun-entity-slash')

const filteredTypes = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q
    ? types.value.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.type.toLowerCase().startsWith(q)
      )
    : types.value
})

/** What the list shows: types, or search hits. */
const options = computed<{ key: string; label: string; sub?: string; thumb?: string; icon?: string }[]>(() =>
  picked.value
    ? results.value.map((hit, index) => ({
        key: `${hit.ref.type}:${hit.ref.id}:${index}`,
        label: hit.title,
        sub: hit.subtitle,
        thumb: hit.thumbnail
      }))
    : filteredTypes.value.map((item) => ({
        key: item.type,
        label: item.label,
        icon: item.icon
      }))
)
const optionId = (index: number) => `${listId}-${index}`

const setAria = () => {
  const dom = view.value?.dom
  if (!dom) {
    return
  }
  if (open.value && options.value.length) {
    dom.setAttribute('aria-controls', listId)
    dom.setAttribute('aria-activedescendant', optionId(active.value))
  } else {
    dom.removeAttribute('aria-controls')
    dom.removeAttribute('aria-activedescendant')
  }
}
watch([open, active, options], setAria)

const close = () => {
  open.value = false
  picked.value = null
  query.value = ''
  active.value = 0
  slashPos = -1
  clear()
  stopFloating?.()
  stopFloating = null
}

/** The `/` trigger before the caret, read from the document: the type phase
 * matches `/filter` after a block start or whitespace; the search phase checks
 * that the `/` it started from is still there, with the caret after it. */
const readTrigger = (v: EditorView): { slash: number; text: string } | null => {
  const { selection } = v.state
  if (!selection.empty || !(selection instanceof TextSelection)) {
    return null
  }
  const { $from } = selection
  if (!$from.parent.isTextblock || entityForbiddenAt($from)) {
    return null
  }
  const start = $from.start()
  if (picked.value) {
    if (slashPos < start || slashPos >= $from.pos) {
      return null
    }
    const text = v.state.doc.textBetween(slashPos, $from.pos, '\n', '￼')
    return text.startsWith('/') && !/[\n￼]/.test(text)
      ? { slash: slashPos, text: text.slice(1) }
      : null
  }
  const before = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 40),
    $from.parentOffset,
    undefined,
    '￼'
  )
  const match = /(?:^|\s)\/([^\s/￼]{0,20})$/.exec(before)
  return match
    ? { slash: $from.pos - (match[1] ?? '').length - 1, text: match[1] ?? '' }
    : null
}

const update = () => {
  const v = view.value
  if (!v || v.isDestroyed) {
    close()
    return
  }
  // Mid-composition the document holds the IME's preedit: leave everything as
  // it is until the composition commits.
  if (v.composing) {
    return
  }
  const enabled =
    v.editable &&
    v.hasFocus() &&
    types.value.length > 0 &&
    !!ctx?.adapters.searchEntities
  const trigger = enabled ? readTrigger(v) : null
  if (!trigger) {
    // The dismissed `/` is gone (or the caret left it): a new one may open.
    dismissedSlash = -1
    close()
    return
  }
  if (trigger.slash === dismissedSlash) {
    close()
    return
  }
  const opening = !open.value || slashPos !== trigger.slash
  slashPos = trigger.slash
  if (trigger.text !== query.value || opening) {
    query.value = trigger.text
    active.value = 0
    if (picked.value) {
      search(picked.value.type, trigger.text)
    }
  }
  if (!picked.value && !filteredTypes.value.length) {
    close()
    return
  }
  open.value = true
  if (opening && rootRef.value) {
    stopFloating?.()
    const anchorPos = trigger.slash
    stopFloating = floatNear(
      {
        getBoundingClientRect: () => {
          const c = v.coordsAtPos(Math.min(anchorPos, v.state.doc.content.size))
          return new DOMRect(c.left, c.top, 0, c.bottom - c.top)
        },
        contextElement: v.dom
      },
      rootRef.value
    )
  }
}

/** Delete `from`–`to` of the document, keeping the caret at `from`. */
const deleteRange = (v: EditorView, from: number, to: number) => {
  if (to > from) {
    v.dispatch(v.state.tr.delete(from, to))
  }
}

const pickType = (item: EntityTypeItem) => {
  const v = view.value
  if (!v || slashPos < 0) {
    return
  }
  picked.value = item
  // The filter text was for choosing the type, not part of the search.
  deleteRange(v, slashPos + 1, v.state.selection.from)
  query.value = ''
  active.value = 0
  clear()
  v.focus()
}

const pickHit = (hit: EntityHit) => {
  const v = view.value
  if (!v || slashPos < 0) {
    return
  }
  const tr = v.state.tr
  if (replaceRangeWithEntity(tr, slashPos, v.state.selection.from, hit.ref)) {
    v.dispatch(tr.scrollIntoView())
  }
  close()
  v.focus()
}

const pick = (index: number) => {
  if (picked.value) {
    const hit = results.value[index]
    if (hit) pickHit(hit)
  } else {
    const item = filteredTypes.value[index]
    if (item) pickType(item)
  }
}

const backToTypes = () => {
  picked.value = null
  query.value = ''
  active.value = 0
  clear()
}

const onKeydown = (event: KeyboardEvent) => {
  const v = view.value
  if (!open.value || !v?.hasFocus() || event.isComposing || event.keyCode === 229) {
    return
  }
  const take = () => {
    event.preventDefault()
    event.stopPropagation()
  }
  const count = options.value.length
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      if (count) {
        take()
        active.value =
          (active.value + (event.key === 'ArrowDown' ? 1 : count - 1)) % count
      }
      break
    case 'Enter':
    case 'Tab':
      if (count && !event.shiftKey) {
        take()
        pick(active.value)
      } else if (event.key === 'Enter' && picked.value && loading.value) {
        // Hits are on their way: Enter must not split the paragraph out from
        // under them.
        take()
      } else if (event.key === 'Enter') {
        // Nothing to pick: this `/` was text after all. Close and let Enter
        // start the new line it was pressed for.
        dismissedSlash = slashPos
        close()
      }
      break
    case 'Escape':
      take()
      if (picked.value && !query.value) {
        // Remove the `/` trigger — the user typed nothing else.
        const at = slashPos
        close()
        deleteRange(v, at, at + 1)
      } else {
        dismissedSlash = slashPos
        close()
      }
      break
    case 'Backspace':
      if (picked.value && !query.value) {
        take()
        backToTypes()
      }
      break
  }
}

onMounted(() => {
  update()
  window.addEventListener('keydown', onKeydown, true)
})
watch([view, prevState], update)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true)
  stopFloating?.()
  const dom = view.value?.dom
  dom?.removeAttribute('aria-controls')
  dom?.removeAttribute('aria-activedescendant')
})
</script>

<template>
  <div
    ref="rootRef"
    class="kun-entity-slash"
    :data-show="open ? 'true' : 'false'"
    :data-phase="picked ? 'search' : 'types'"
    :aria-hidden="open ? undefined : 'true'"
  >
    <div class="kun-entity-slash__header">
      <template v-if="picked">
        <span class="kun-entity-slash__type">{{ picked.label }}</span>
        <span class="kun-entity-slash__query">{{ query || t.search(picked.label) }}</span>
      </template>
      <span v-else class="kun-entity-slash__title">{{ t.insert }}</span>
    </div>
    <div
      :id="listId"
      role="listbox"
      class="kun-entity-slash__list"
      :aria-label="picked ? t.search(picked.label) : t.types"
      :aria-busy="loading ? 'true' : undefined"
    >
      <div
        v-for="(option, index) in options"
        :id="optionId(index)"
        :key="option.key"
        role="option"
        class="kun-entity-slash__option"
        :aria-selected="index === active"
        :data-active="index === active"
        @mousedown.prevent="pick(index)"
        @mouseenter="active = index"
      >
        <img
          v-if="option.thumb"
          class="kun-entity-slash__thumb"
          :src="option.thumb"
          alt=""
          loading="lazy"
          draggable="false"
        />
        <span class="kun-entity-slash__text">
          <span class="kun-entity-slash__label">{{ option.label }}</span>
          <span v-if="option.sub" class="kun-entity-slash__sub">{{ option.sub }}</span>
        </span>
      </div>
    </div>
    <div v-if="picked && !options.length" class="kun-entity-slash__hint" aria-live="polite">
      {{ loading ? t.searching : failed ? t.failed : query.trim() ? t.empty : t.prompt }}
    </div>
  </div>
</template>
