<script setup lang="ts">
// The entity popover — one small, non-modal panel anchored at an entity node,
// in two situations:
//
// - OFFER: right after a paste (or a keyboard's committed clip) turned a URL
//   into a card / chip: 卡片 / 行内 / 链接. It goes away by itself the moment
//   anything else happens — typing on, clicking elsewhere (core withdraws the
//   offer on any edit or selection change that is not its own).
// - SELECTED: a card / chip is selected (clicked, tapped, arrowed onto):
//   卡片 / 行内 / 链接 / 删除.
//
// It never takes focus from the document, and never takes a key the user
// meant for the document: Enter right after a paste still starts a new line.
// The keyboard way in is Tab (Shift+Tab from the end); inside, ←/→ (or Tab)
// move, Enter / Space applies, Esc closes, any other key leaves the panel and
// does its usual thing. `aria-activedescendant` on the editor names the
// highlighted button for assistive tech while focus stays in the text.
//
// 链接 writes an ordinary `[title](url)` link — the host's `entityTitle`
// adapter supplies the title; without one (or when it fails / is slow) the
// text is the URL without its scheme. A bare `[url](url)` would be a chip
// again, so it is never written.
import { usePluginViewContext } from '@prosemirror-adapter/vue'
import {
  deleteEntity,
  entityAt,
  entityLinkFallbackText,
  entityOffer,
  selectedEntity,
  setEntityDisplay,
  withEntityOffer
} from '@kungal/editor-core/preset'
import type { EntityAt } from '@kungal/editor-core/preset'
import type { EntityDisplay } from '@kungal/editor-core'
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import { entityDomId, entityLabels, floatNear, useLiveView } from '../entity-shared'

type Choice = EntityDisplay | 'remove'

const { view, prevState } = usePluginViewContext()
// `view` is a per-update snapshot: fine for reading in `update`, never for
// dispatch-then-read / focus / await — those use the live one.
const liveView = useLiveView()
const ctx = inject(KUN_EDITOR_CONTEXT)
const t = computed(() => entityLabels(ctx?.locale))

const rootRef = ref<HTMLElement | null>(null)
const mode = ref<'offer' | 'selected' | null>(null)
const target = ref<EntityAt | null>(null)
/** The keyboard highlight (index into `choices`), -1 when the panel is not
 * being driven by keys. */
const active = ref(-1)
/** 链接 waiting on the host's title. */
const pending = ref(false)
/** A selected entity whose panel Esc closed — stays closed until the
 * selection moves on. */
let dismissedAt: number | null = null
let stopFloating: (() => void) | null = null
let titleRequest: AbortController | null = null
const idBase = entityDomId('kun-entity-menu')

const choices = computed<{ id: Choice; label: string }[]>(() => {
  const entity = target.value
  const v = view.value
  if (!entity || !v) {
    return []
  }
  const state = v.state
  const possible = (display: EntityDisplay) =>
    display === entity.display ||
    setEntityDisplay(state.tr, entity.pos, display, display === 'link' ? '·' : undefined)
  const out: { id: Choice; label: string }[] = []
  if (possible('card')) out.push({ id: 'card', label: t.value.card })
  if (possible('chip')) out.push({ id: 'chip', label: t.value.chip })
  if (ctx?.adapters.entityTitle || entityLinkFallbackText(entity.ref.url)) {
    out.push({ id: 'link', label: t.value.link })
  }
  if (mode.value === 'selected') out.push({ id: 'remove', label: t.value.remove })
  return out
})

const optionId = (index: number) => `${idBase}-${index}`

const setActiveDescendant = () => {
  const dom = view.value?.dom
  if (!dom) {
    return
  }
  if (mode.value && active.value >= 0) {
    dom.setAttribute('aria-activedescendant', optionId(active.value))
  } else {
    dom.removeAttribute('aria-activedescendant')
  }
}
watch([active, mode], setActiveDescendant)

const hide = () => {
  stopFloating?.()
  stopFloating = null
  mode.value = null
  target.value = null
  active.value = -1
}

const show = (next: 'offer' | 'selected', entity: EntityAt) => {
  const v = view.value
  const anchor = v?.nodeDOM(entity.pos)
  const el = rootRef.value
  if (!v || !el || !(anchor instanceof Element)) {
    hide()
    return
  }
  const moved = target.value?.pos !== entity.pos || mode.value !== next
  mode.value = next
  target.value = entity
  if (moved) {
    active.value = -1
    stopFloating?.()
    stopFloating = floatNear(anchor, el)
  }
}

const update = () => {
  const v = view.value
  if (!v || v.isDestroyed || !v.editable) {
    hide()
    return
  }
  if (!v.hasFocus()) {
    hide()
    return
  }
  const offer = entityOffer(v.state)
  if (offer) {
    show('offer', offer)
    return
  }
  const selected = selectedEntity(v.state)
  if (selected?.pos !== dismissedAt) {
    dismissedAt = null
  }
  if (selected && dismissedAt === null) {
    show('selected', selected)
    return
  }
  hide()
}

const close = () => {
  const v = liveView()
  if (mode.value === 'offer' && v) {
    v.dispatch(withEntityOffer(v.state.tr, null))
  } else if (target.value) {
    dismissedAt = target.value.pos
  }
  hide()
}

const titleFor = async (entity: EntityAt): Promise<string | null> => {
  const entityTitle = ctx?.adapters.entityTitle
  const fallback = entityLinkFallbackText(entity.ref.url)
  if (!entityTitle) {
    return fallback
  }
  titleRequest?.abort()
  const request = new AbortController()
  titleRequest = request
  pending.value = true
  // A slow host must not leave the button hanging: 1.5s, then the fallback.
  const timeout = setTimeout(() => request.abort(), 1500)
  try {
    const title = await Promise.race([
      entityTitle(entity.ref, request.signal),
      new Promise<null>((resolve) =>
        request.signal.addEventListener('abort', () => resolve(null))
      )
    ])
    return title?.trim() || fallback
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
    if (titleRequest === request) {
      titleRequest = null
      pending.value = false
    }
  }
}

const choose = async (choice: Choice) => {
  const v = liveView()
  const entity = target.value
  if (!v || !entity || pending.value) {
    return
  }
  const caret = mode.value === 'offer' ? 'after' : 'select'
  if (choice === 'remove') {
    const tr = withEntityOffer(v.state.tr, null)
    if (deleteEntity(tr, entity.pos)) {
      v.dispatch(tr.scrollIntoView())
    }
  } else if (choice === 'link') {
    const doc = v.state.doc
    const text = await titleFor(entity)
    // Whatever happened while the title loaded wins: an edit in between means
    // the user has moved on, and this click no longer applies.
    if (!text || v.isDestroyed || v.state.doc !== doc) {
      return
    }
    const now = entityAt(v.state.doc, entity.pos)
    const tr = withEntityOffer(v.state.tr, null)
    if (now?.ref.url === entity.ref.url && setEntityDisplay(tr, entity.pos, 'link', text)) {
      v.dispatch(tr.scrollIntoView())
    }
  } else {
    const tr = withEntityOffer(v.state.tr, null)
    if (setEntityDisplay(tr, entity.pos, choice, undefined, caret)) {
      v.dispatch(tr.scrollIntoView())
    }
  }
  v.focus()
}

// The editor keeps focus, so keys reach ProseMirror first unless taken here in
// the capture phase — and only the ones the panel owns (see the header).
const onKeydown = (event: KeyboardEvent) => {
  const v = liveView()
  if (!mode.value || !v?.hasFocus() || event.isComposing || event.keyCode === 229) {
    return
  }
  const count = choices.value.length
  const take = () => {
    event.preventDefault()
    event.stopPropagation()
  }
  if (event.key === 'Escape') {
    take()
    close()
    return
  }
  if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey && count) {
    take()
    if (active.value < 0) {
      const current = choices.value.findIndex((c) => c.id === target.value?.display)
      active.value = event.shiftKey ? count - 1 : Math.max(current, 0)
    } else {
      active.value = (active.value + (event.shiftKey ? count - 1 : 1)) % count
    }
    return
  }
  if (active.value < 0) {
    return
  }
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    take()
    active.value =
      (active.value + (event.key === 'ArrowRight' ? 1 : count - 1)) % count
  } else if (event.key === 'Enter' || event.key === ' ') {
    take()
    const choice = choices.value[active.value]
    if (choice) {
      void choose(choice.id)
    }
  } else if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
    // Any other key belongs to the document again.
    active.value = -1
  }
}

// Focus is not a transaction: clicking a card in an unfocused editor selects it
// first and focuses it after, and leaving the editor changes nothing in its
// state. Re-read on both, or the bubble would miss the one and outlive the other.
let focusTarget: HTMLElement | null = null
const onFocusChange = () => update()

onMounted(() => {
  update()
  window.addEventListener('keydown', onKeydown, true)
  focusTarget = view.value?.dom ?? null
  focusTarget?.addEventListener('focus', onFocusChange)
  focusTarget?.addEventListener('blur', onFocusChange)
})
watch([view, prevState], update)
onBeforeUnmount(() => {
  focusTarget?.removeEventListener('focus', onFocusChange)
  focusTarget?.removeEventListener('blur', onFocusChange)
  window.removeEventListener('keydown', onKeydown, true)
  titleRequest?.abort()
  stopFloating?.()
  view.value?.dom.removeAttribute('aria-activedescendant')
})
</script>

<template>
  <div
    ref="rootRef"
    class="kun-entity-menu"
    role="toolbar"
    :aria-label="t.display"
    :data-show="mode ? 'true' : 'false'"
    :data-mode="mode ?? undefined"
    :aria-hidden="mode ? undefined : 'true'"
  >
    <button
      v-for="(choice, index) in choices"
      :id="optionId(index)"
      :key="choice.id"
      type="button"
      tabindex="-1"
      class="kun-entity-menu__item"
      :data-choice="choice.id"
      :data-active="index === active"
      :data-loading="choice.id === 'link' && pending ? 'true' : undefined"
      :aria-pressed="choice.id === target?.display"
      @mousedown.prevent="choose(choice.id)"
    >
      {{ choice.label }}
    </button>
  </div>
</template>
