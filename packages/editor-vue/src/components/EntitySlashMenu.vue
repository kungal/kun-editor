<script setup lang="ts">
// The `/` menu — insert an entity reference without leaving the keyboard.
//
// `/` at the start of a paragraph or after whitespace opens a command card of
// the host's `entityTypes` (host order): icon, label, description, `/command`.
// What is typed after the `/` filters on label and command (prefix matches
// first, the match highlighted); with nothing matching the card says so, and
// a space then closes it (that `/` was just a slash — "a / b"). A second `/`
// closes it too ("/usr/bin").
//
// Picking a type (↑/↓ + Enter / Tab, or a click):
// - with the host's `entityPrompt`: the `/filter` text is removed and the host
//   opens its own modal (`promptForEntity` holds the insertion point, inserts
//   the answer — a CARD when the paragraph is empty, else a CHIP — and gives
//   focus back);
// - without it: the menu turns into an inline search over that type. The
//   query is typed IN THE DOCUMENT after the `/` (spaces allowed, IME works as
//   anywhere else); results are debounced and abortable; picking a hit
//   replaces `/query` with the entity by the same rule.
//
// Esc: on the type list, closes and leaves the `/`; while searching with an
// empty query, removes the `/` trigger — and nothing else — and closes; with a
// query, closes and leaves the text as typed. Backspace on an empty query goes
// back to the type list. Enter with nothing to pick closes the menu and does
// what Enter does.
//
// Focus never leaves the document: the list is a `role="listbox"` and the
// editor's `aria-activedescendant` names the active option.
import { usePluginViewContext } from '@prosemirror-adapter/vue'
import { TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import {
  entityForbiddenAt,
  promptForEntity,
  replaceRangeWithEntity
} from '@kungal/editor-core/preset'
import type { EntityHit, EntityTypeItem } from '@kungal/editor-core'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import {
  entityDomId,
  entityLabels,
  filterEntityTypes,
  floatNear,
  useEntitySearch,
  useLiveView
} from '../entity-shared'
import EntityIcon from './EntityIcon.vue'
import EntityTypeList from './EntityTypeList.vue'

const { view, prevState } = usePluginViewContext()
// `view` is a per-update snapshot: fine for reading in `update`, never for
// dispatch-then-read / focus / await — those use the live one.
const liveView = useLiveView()
const ctx = inject(KUN_EDITOR_CONTEXT)
const t = computed(() => entityLabels(ctx?.locale))
const types = computed<EntityTypeItem[]>(() => ctx?.adapters.entityTypes ?? [])
const { results, loading, failed, search, clear } = useEntitySearch(
  () => ctx?.adapters ?? {}
)

const rootRef = ref<HTMLElement | null>(null)
const hitsRef = ref<HTMLElement | null>(null)
const open = ref(false)
/** The type being searched inline; null while the type list shows. */
const picked = ref<EntityTypeItem | null>(null)
/** Text after the `/`: the type filter, or the search query. */
const query = ref('')
const active = ref(0)
/** Document position of the `/`. Valid while the caret stays after it in the
 * same block — every edit then happens at the caret, after it. */
let slashPos = -1
/** A `/` whose menu was closed (Esc, a space with nothing matching): it
 * stays a plain slash. */
let dismissedSlash = -1
let stopFloating: (() => void) | null = null
const listId = entityDomId('kun-entity-slash')

const matches = computed(() => filterEntityTypes(types.value, query.value))
const count = computed(() =>
  picked.value ? results.value.length : matches.value.length
)
const optionId = (index: number) => `${listId}-${index}`

const setAria = () => {
  const dom = view.value?.dom
  if (!dom) {
    return
  }
  if (open.value && count.value) {
    dom.setAttribute('aria-controls', listId)
    dom.setAttribute('aria-activedescendant', optionId(active.value))
  } else {
    dom.removeAttribute('aria-controls')
    dom.removeAttribute('aria-activedescendant')
  }
}
watch([open, active, count], setAria)

// The search hits scroll the active one into view (the type rows do it
// themselves, in EntityTypeList).
watch([active, results], async () => {
  await nextTick()
  hitsRef.value
    ?.querySelector<HTMLElement>(`[data-index="${active.value}"]`)
    ?.scrollIntoView({ block: 'nearest' })
})

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

const dismiss = () => {
  dismissedSlash = slashPos
  close()
}

/** The `/` trigger before the caret, read from the document: the type phase
 * matches `/filter` after a block start or whitespace (the filter may hold
 * spaces, never start with one); the search phase checks that the `/` it
 * started from is still there, with the caret after it. */
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
    Math.max(0, $from.parentOffset - 48),
    $from.parentOffset,
    undefined,
    '￼'
  )
  const match = /(?:^|\s)\/((?:[^\s/￼][^\n/￼]{0,39})?)$/.exec(before)
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
    (!!ctx?.adapters.entityPrompt || !!ctx?.adapters.searchEntities)
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
  // Nothing matches and a space was typed: that `/` was prose.
  if (!picked.value && !matches.value.length && /\s$/.test(trigger.text)) {
    dismiss()
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

const pickType = (item: EntityTypeItem) => {
  const v = liveView()
  if (!v || slashPos < 0) {
    return
  }
  const prompt = ctx?.adapters.entityPrompt
  if (prompt) {
    // The host's own modal: hand off, the trigger range goes with the pick.
    const range = { from: slashPos, to: v.state.selection.from }
    close()
    void promptForEntity(v, prompt, item.type, range)
    return
  }
  picked.value = item
  // The filter text was for choosing the type, not part of the search.
  const caret = v.state.selection.from
  if (caret > slashPos + 1) {
    v.dispatch(v.state.tr.delete(slashPos + 1, caret))
  }
  query.value = ''
  active.value = 0
  clear()
  v.focus()
}

const pickHit = (hit: EntityHit) => {
  const v = liveView()
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
    const match = matches.value[index]
    if (match) pickType(match.item)
  }
}

const backToTypes = () => {
  picked.value = null
  query.value = ''
  active.value = 0
  clear()
}

const onKeydown = (event: KeyboardEvent) => {
  const v = liveView()
  if (!open.value || !v?.hasFocus() || event.isComposing || event.keyCode === 229) {
    return
  }
  const take = () => {
    event.preventDefault()
    event.stopPropagation()
  }
  const n = count.value
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      if (n) {
        take()
        active.value = (active.value + (event.key === 'ArrowDown' ? 1 : n - 1)) % n
      }
      break
    case 'Enter':
    case 'Tab':
      if (n && !event.shiftKey) {
        take()
        pick(active.value)
      } else if (event.key === 'Enter' && picked.value && loading.value) {
        // Hits are on their way: Enter must not split the paragraph out from
        // under them.
        take()
      } else if (event.key === 'Enter') {
        // Nothing to pick: this `/` was text after all. Close and let Enter
        // start the new line it was pressed for.
        dismiss()
      }
      break
    case 'Escape':
      take()
      if (picked.value && !query.value) {
        // Remove the `/` trigger — the user typed nothing else.
        const at = slashPos
        close()
        v.dispatch(v.state.tr.delete(at, at + 1))
      } else {
        dismiss()
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
    <EntityTypeList
      v-if="!picked"
      :matches="matches"
      :active="active"
      :id-base="listId"
      :label="t.types"
      :empty-label="t.noTypes"
      @pick="pick"
      @hover="active = $event"
    />
    <template v-else>
      <div class="kun-entity-slash__header">
        <EntityIcon :icon="picked.icon" :label="picked.label" />
        <span class="kun-entity-slash__type">{{ picked.label }}</span>
        <span class="kun-entity-slash__query">{{ query || t.search(picked.label) }}</span>
      </div>
      <div
        :id="listId"
        ref="hitsRef"
        role="listbox"
        class="kun-entity-slash__list"
        :aria-label="t.search(picked.label)"
        :aria-busy="loading ? 'true' : undefined"
      >
        <div
          v-for="(hit, index) in results"
          :id="optionId(index)"
          :key="`${hit.ref.type}:${hit.ref.id}`"
          role="option"
          class="kun-entity-slash__option"
          :data-index="index"
          :aria-selected="index === active"
          :data-active="index === active"
          @mousedown.prevent="pick(index)"
          @mousemove="index !== active && (active = index)"
        >
          <img
            v-if="hit.thumbnail"
            class="kun-entity-slash__thumb"
            :src="hit.thumbnail"
            alt=""
            loading="lazy"
            draggable="false"
          />
          <span class="kun-entity-slash__text">
            <span class="kun-entity-slash__label">{{ hit.title }}</span>
            <span v-if="hit.subtitle" class="kun-entity-slash__sub">{{ hit.subtitle }}</span>
          </span>
        </div>
      </div>
      <div v-if="!results.length" class="kun-entity-slash__hint" aria-live="polite">
        {{ loading ? t.searching : failed ? t.failed : query.trim() ? t.empty : t.prompt }}
      </div>
    </template>
  </div>
</template>
