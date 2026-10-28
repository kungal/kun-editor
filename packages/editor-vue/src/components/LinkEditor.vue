<script setup lang="ts">
// The ONE link editor — the selection bubble, the headless toolbar's panel,
// the KunUI toolbar's popover and Mod-K all open this (exported as
// KunLinkEditor), so it looks and behaves the same everywhere.
//
// Two stacked fields, 文本 and 链接, for `[文本](链接)`:
// - prefilled from the draft (`linkDraft`): the selected text, or the link
//   being edited (then 移除链接 and 打开 are offered too);
// - nothing selected: both empty — 链接 prefilled from the clipboard when it
//   holds a URL AND can be read without a permission prompt;
// - 文本 is read-only when the target is not plain text in one block (it spans
//   paragraphs, or holds a chip / image): the link goes on as it is;
// - Enter applies from either field (not mid-composition — an IME's Enter
//   commits its text), Esc cancels, Tab moves between them; focus starts in the
//   first empty field (链接 when neither is).
// It applies nothing itself: `submit` / `cancel` / `unlink` go to the wrapper.
// No <form>: hosts render the editor inside their own, and forms don't nest.
import type { KunEditorLocale } from '@kungal/editor-core'
import { normalizeLinkHref } from '@kungal/editor-core'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { linkLabels, peekClipboardUrl } from '../link-shared'
import { entityDomId } from '../entity-shared'

export interface KunLinkDraft {
  text: string
  href: string
  /** An existing link: offer 移除链接 / 打开. */
  editing: boolean
  /** Whether 文本 may be changed. */
  textEditable: boolean
}

const props = withDefaults(
  defineProps<{
    draft: KunLinkDraft
    locale?: KunEditorLocale
    /** Take focus on mount (false: shown without stealing it). */
    autofocus?: boolean
  }>(),
  { locale: 'zh-cn', autofocus: true }
)
const emit = defineEmits<{
  submit: [link: { text?: string; href: string }]
  cancel: []
  unlink: []
}>()

const t = computed(() => linkLabels(props.locale))
const text = ref(props.draft.text)
const href = ref(props.draft.href)
/** Once the user typed, the draft no longer overwrites the fields. */
const dirty = ref(false)
const invalid = ref(false)
const textRef = ref<HTMLInputElement | null>(null)
const hrefRef = ref<HTMLInputElement | null>(null)
const ids = entityDomId('kun-link-editor')

watch(
  () => props.draft,
  (draft) => {
    if (!dirty.value) {
      text.value = draft.text
      href.value = draft.href
    }
  }
)

const openHref = computed(() => normalizeLinkHref(href.value))

/**
 * Focus the first empty field (链接 when neither is). The panel holding the
 * editor may not be showing yet — the selection bubble's position update is
 * throttled, a popover may still be animating in — and focusing an input that
 * is `visibility: hidden` silently does nothing. So: try, and if focus did not
 * land, try again on the next frames (briefly).
 */
const focusFirstEmpty = (attempt = 0) => {
  const target =
    props.draft.textEditable && !text.value.trim() ? textRef.value : hrefRef.value
  if (!target) return
  target.focus({ preventScroll: true })
  if (target.ownerDocument.activeElement === target) {
    target.select()
  } else if (attempt < 10) {
    requestAnimationFrame(() => focusFirstEmpty(attempt + 1))
  }
}

const submit = () => {
  if (!href.value.trim()) {
    invalid.value = true
    hrefRef.value?.focus()
    return
  }
  emit('submit', {
    text: props.draft.textEditable ? text.value : undefined,
    href: href.value
  })
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.isComposing || event.keyCode === 229) return
  if (event.key === 'Enter') {
    event.preventDefault()
    submit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('cancel')
  }
}

const onInput = () => {
  dirty.value = true
  invalid.value = false
}

onMounted(async () => {
  if (!props.draft.editing && !props.draft.href) {
    const url = await peekClipboardUrl()
    if (url && !dirty.value && !href.value) {
      href.value = url
    }
  }
  if (props.autofocus) {
    await nextTick()
    focusFirstEmpty()
  }
})

defineExpose({ focus: () => focusFirstEmpty() })
</script>

<template>
  <div class="kun-link-editor" role="group" :aria-label="t.title" @keydown="onKeydown">
    <input
      ref="textRef"
      v-model="text"
      class="kun-link-editor__input"
      data-field="text"
      type="text"
      :placeholder="t.text"
      :aria-label="t.text"
      :readonly="!draft.textEditable"
      autocomplete="off"
      @input="onInput"
    />
    <!-- `type="text"` + `inputmode="url"`, never `type="url"`: native URL
         validation rejects a schemeless `www.a.com/x` — the very input
         normalizeLinkHref completes. -->
    <input
      ref="hrefRef"
      v-model="href"
      class="kun-link-editor__input"
      data-field="href"
      type="text"
      inputmode="url"
      spellcheck="false"
      autocomplete="off"
      :placeholder="t.href"
      :aria-label="t.href"
      :aria-invalid="invalid ? 'true' : undefined"
      :aria-describedby="invalid ? `${ids}-err` : undefined"
      @input="onInput"
    />
    <span v-if="invalid" :id="`${ids}-err`" class="kun-link-editor__error" role="alert">
      {{ t.needHref }}
    </span>
    <div class="kun-link-editor__actions">
      <template v-if="draft.editing">
        <button
          type="button"
          class="kun-link-editor__action"
          data-action="unlink"
          @mousedown.prevent
          @click="emit('unlink')"
        >
          {{ t.unlink }}
        </button>
        <a
          class="kun-link-editor__action"
          data-action="open"
          :href="openHref || undefined"
          target="_blank"
          rel="noopener noreferrer"
          @mousedown.prevent
        >
          {{ t.open }}
        </a>
      </template>
      <span class="kun-link-editor__spacer" />
      <button
        type="button"
        class="kun-link-editor__action"
        data-action="cancel"
        @mousedown.prevent
        @click="emit('cancel')"
      >
        {{ t.cancel }}
      </button>
      <button
        type="button"
        class="kun-link-editor__action"
        data-action="apply"
        @mousedown.prevent
        @click="submit"
      >
        {{ t.apply }}
      </button>
    </div>
  </div>
</template>
