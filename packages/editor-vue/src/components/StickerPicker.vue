<script setup lang="ts">
// The headless toolbar's emoji + sticker button: a trigger + a click-outside
// popover holding <StickerPanel> (the one panel both toolbars share). The
// panel mounts while open only, so the `stickerSource` adapter is read on the
// first open, not with the editor.
//
// - Emoji are inserted as plain text; stickers as image nodes. The sticker
//   sections only exist with the adapter (stickers ARE images, so an
//   image-free editor gets emoji only).
// - Inserts act on editor STATE (no focus needed): clicking the panel blurs
//   the editor, and the pick still lands at the retained selection. The panel
//   stays open for the next pick; Esc closes it and hands focus back.
//
// Lives inside <MilkdownProvider> (rendered by EditorToolbar) so useInstance()
// reaches the editor.
import { callCommand } from '@milkdown/kit/utils'
import { insertImageCommand } from '@milkdown/kit/preset/commonmark'
import { editorViewCtx } from '@milkdown/kit/core'
import { useInstance } from '@milkdown/vue'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import { floatNear } from '../entity-shared'
import type { KunStickerPick } from '../sticker-recent'
import { TOOLBAR_ICONS } from '../toolbar-icons'
import StickerPanel from './StickerPanel.vue'

const [, getEditor] = useInstance()
const ctx = inject(KUN_EDITOR_CONTEXT)
const trigger = computed(() =>
  (ctx?.locale ?? 'zh-cn').toLowerCase().startsWith('en') ? 'Emoji & stickers' : '表情与贴纸'
)

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

// Kept inside the viewport by floating-ui (the button often sits at the end of
// the toolbar, where a left-anchored 360px panel runs off-screen). A phone gets
// the stylesheet's bottom sheet instead, which needs no positioning.
let stopFloating: (() => void) | null = null
watch(open, async (isOpen) => {
  stopFloating?.()
  stopFloating = null
  await nextTick()
  const phone =
    typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches
  if (isOpen && !phone && triggerRef.value && panelRef.value) {
    stopFloating = floatNear(triggerRef.value, panelRef.value)
  }
})
onBeforeUnmount(() => stopFloating?.())

const close = (refocus: boolean) => {
  open.value = false
  if (refocus) {
    getEditor()?.action((c) => c.get(editorViewCtx).focus())
  }
}

// Close on outside click. The trigger + panel are inside rootRef, so clicks on
// them don't close (the panel stays open for inserting several).
const onDocClick = (e: MouseEvent) => {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    close(false)
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

const insert = (item: KunStickerPick) => {
  getEditor()?.action((c) => {
    if (item.kind === 'emoji') {
      const view = c.get(editorViewCtx)
      view.dispatch(view.state.tr.insertText(item.text))
    } else {
      callCommand(insertImageCommand.key, { src: item.src, title: item.name, alt: item.name })(c)
    }
  })
}
</script>

<template>
  <div ref="rootRef" class="kun-editor__picker">
    <button
      ref="triggerRef"
      type="button"
      class="kun-editor__tool"
      :title="trigger"
      :aria-label="trigger"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="kun-editor__icon" v-html="TOOLBAR_ICONS.smile" />
    </button>

    <div
      v-if="open"
      ref="panelRef"
      class="kun-editor__picker-panel"
      @keydown.esc.stop.prevent="close(true)"
    >
      <StickerPanel
        :adapters="ctx?.adapters ?? {}"
        :locale="ctx?.locale"
        @pick="insert"
      />
    </div>
  </div>
</template>
