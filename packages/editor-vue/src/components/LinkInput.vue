<script setup lang="ts">
// Link URL entry for the FIXED toolbar. Same job as the selection bubble's
// inline input, different shape: the toolbar is a static row, so swapping it out
// would be jarring — this is a small panel under the button instead (the same
// click-outside popover pattern as StickerPicker; no floating-ui, no UI kit).
//
// Focus moves to the input, which blurs the editor — that's fine: ProseMirror
// keeps its state selection across a DOM blur, and the command dispatches on
// state, so the link still wraps exactly what was selected. With nothing
// selected, insertLinkCommand inserts the URL as linked text.
//
// The host's `linkPrompt` adapter takes precedence: with one supplied, the
// button opens no panel and defers to it (one override covers every entry).
import { callCommand } from '@milkdown/kit/utils'
import { editorViewCtx } from '@milkdown/kit/core'
import { useInstance } from '@milkdown/vue'
import { insertLinkCommand } from '@kungal/editor-core/preset'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import { readSelectedHref } from '../selected-href'
import { TOOLBAR_ICONS as I } from '../toolbar-icons'

const [, getEditor] = useInstance()
const ctx = inject(KUN_EDITOR_CONTEXT)
const isEnglish = computed(() =>
  (ctx?.locale ?? 'zh-cn').toLowerCase().startsWith('en')
)
const t = computed(() => {
  const en = isEnglish.value
  return {
    link: en ? 'Link' : '链接',
    linkUrl: en ? 'Link URL' : '链接 URL',
    apply: en ? 'Apply' : '确定'
  }
})

const open = ref(false)
const url = ref('')
const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const applyHref = (href: string) => {
  if (href) {
    getEditor()?.action(callCommand(insertLinkCommand.key, { href }))
  }
}

const close = () => {
  open.value = false
  url.value = ''
}

/** Applying / cancelling hands focus back to the editor, so the user keeps
 * typing where they were (an outside click doesn't — they aimed elsewhere). */
const closeAndFocus = () => {
  close()
  getEditor()?.action((c) => c.get(editorViewCtx).focus())
}

const apply = () => {
  applyHref(url.value.trim())
  closeAndFocus()
}

const toggle = async () => {
  const linkPrompt = ctx?.adapters.linkPrompt
  if (linkPrompt) {
    let text = ''
    getEditor()?.action((c) => {
      const { state } = c.get(editorViewCtx)
      const { from, to } = state.selection
      text = state.doc.textBetween(from, to, ' ')
    })
    applyHref((await linkPrompt({ text }))?.trim() ?? '')
    return
  }
  if (open.value) {
    close()
    return
  }
  // Prefill from the selection, so re-linking edits the URL instead of retyping.
  getEditor()?.action((c) => {
    url.value = readSelectedHref(c.get(editorViewCtx).state, c)
  })
  open.value = true
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

// Close on outside click — the trigger and the panel are both inside rootRef.
const onDocClick = (e: MouseEvent) => {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    close()
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootRef" class="kun-editor__link">
    <button
      type="button"
      class="kun-editor__tool"
      :title="t.link"
      :aria-label="t.link"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="kun-editor__icon" v-html="I.link" />
    </button>

    <!-- No <form>: the editor often sits inside the host's own form, and nested
         forms are invalid HTML. Enter / Esc do the same job. -->
    <div v-show="open" class="kun-editor__link-panel">
      <input
        ref="inputRef"
        v-model="url"
        type="url"
        class="kun-editor__link-input"
        :placeholder="t.linkUrl"
        :aria-label="t.linkUrl"
        spellcheck="false"
        autocomplete="off"
        @keydown.enter.prevent="apply()"
        @keydown.esc.stop.prevent="closeAndFocus()"
      />
      <button
        type="button"
        class="kun-editor__tool"
        :title="t.apply"
        :aria-label="t.apply"
        @click="apply()"
      >
        <span class="kun-editor__icon" v-html="I.check" />
      </button>
    </div>
  </div>
</template>
