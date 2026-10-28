<script setup lang="ts">
// The headless toolbar's link button: a button + a panel holding the one link
// editor (<LinkEditor>: 文本 + 链接) — the same editor the selection bubble and
// Mod-K open. The panel floats under the button, kept inside the visible
// viewport (an on-screen keyboard included). Focus moves into the editor;
// ProseMirror keeps its selection across the blur, so the link lands on what
// was selected (or at the caret), and focus goes back to the text after.
//
// The host's `linkPrompt` adapter takes precedence: with one supplied, the
// button opens no panel and defers to it (one override covers every entry).
import { callCommand } from '@milkdown/kit/utils'
import { editorViewCtx } from '@milkdown/kit/core'
import type { EditorView } from '@milkdown/kit/prose/view'
import { useInstance } from '@milkdown/vue'
import { linkDraft, removeLinkCommand, setLinkCommand } from '@kungal/editor-core/preset'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import { floatNear } from '../entity-shared'
import { askLinkPrompt, linkLabels } from '../link-shared'
import { TOOLBAR_ICONS as I } from '../toolbar-icons'
import LinkEditor from './LinkEditor.vue'
import type { KunLinkDraft } from './LinkEditor.vue'

const [, getEditor] = useInstance()
const ctx = inject(KUN_EDITOR_CONTEXT)
const t = computed(() => linkLabels(ctx?.locale))

const open = ref(false)
const draft = shallowRef<KunLinkDraft>({ text: '', href: '', editing: false, textEditable: true })
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const liveView = (): EditorView | undefined => {
  let view: EditorView | undefined
  getEditor()?.action((c) => {
    view = c.get(editorViewCtx)
  })
  return view
}

const close = (refocus: boolean) => {
  open.value = false
  if (refocus) liveView()?.focus()
}

const toggle = async () => {
  const view = liveView()
  if (!view) return
  const linkPrompt = ctx?.adapters.linkPrompt
  if (linkPrompt) {
    const answer = await askLinkPrompt(linkPrompt, linkDraft(view.state).text)
    if (answer) getEditor()?.action(callCommand(setLinkCommand.key, answer))
    liveView()?.focus()
    return
  }
  if (open.value) {
    close(false)
    return
  }
  const { text, href, editing, textEditable } = linkDraft(view.state)
  draft.value = { text, href, editing, textEditable }
  open.value = true
}

const submit = (link: { text?: string; href: string }) => {
  getEditor()?.action(callCommand(setLinkCommand.key, link))
  close(true)
}
const unlink = () => {
  getEditor()?.action(callCommand(removeLinkCommand.key))
  close(true)
}

let stopFloating: (() => void) | null = null
watch(open, async (isOpen) => {
  stopFloating?.()
  stopFloating = null
  await nextTick()
  if (isOpen && triggerRef.value && panelRef.value) {
    stopFloating = floatNear(triggerRef.value, panelRef.value)
  }
})

// Close on outside click — the trigger and the panel are both inside rootRef.
const onDocClick = (e: MouseEvent) => {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    close(false)
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  stopFloating?.()
})
</script>

<template>
  <div ref="rootRef" class="kun-editor__link">
    <button
      ref="triggerRef"
      type="button"
      class="kun-editor__tool"
      :title="t.title"
      :aria-label="t.title"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="kun-editor__icon" v-html="I.link" />
    </button>
    <div v-if="open" ref="panelRef" class="kun-editor__link-panel">
      <LinkEditor
        :draft="draft"
        :locale="ctx?.locale"
        @submit="submit"
        @cancel="close(true)"
        @unlink="unlink"
      />
    </div>
  </div>
</template>
