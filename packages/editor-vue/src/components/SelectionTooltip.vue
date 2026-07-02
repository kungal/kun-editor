<script setup lang="ts">
// The selection bubble toolbar — a floating inline-format menu shown when text is
// selected (Medium / Notion style). A Milkdown tooltip VIEW, wired the same way
// as the @mention dropdown: a plugin view (usePluginViewFactory) driven by
// @milkdown/kit/plugin/tooltip's TooltipProvider, which positions it over the
// selection (floating-ui) and toggles `data-show`. TooltipProvider's default
// shouldShow already handles it: shown only on a non-empty text selection, while
// focused, and never when read-only.
//
// Headless: plain buttons + inline SVG + `.kun-editor__bubble*` class hooks (like
// the @mention dropdown), styled by the host stylesheet. Uses the SAME toggle
// commands as the fixed toolbar, so behavior is consistent.
import { TooltipProvider } from '@milkdown/kit/plugin/tooltip'
import { usePluginViewContext } from '@prosemirror-adapter/vue'
import { useInstance } from '@milkdown/vue'
import { callCommand } from '@milkdown/kit/utils'
import {
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand
} from '@milkdown/kit/preset/commonmark'
import { toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import type { CmdKey } from '@milkdown/kit/core'
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import { TOOLBAR_ICONS as I } from '../toolbar-icons'

const { view, prevState } = usePluginViewContext()
const [, getEditor] = useInstance()
const ctx = inject(KUN_EDITOR_CONTEXT)
const isEnglish = computed(() =>
  (ctx?.locale ?? 'zh-cn').toLowerCase().startsWith('en')
)

const divRef = ref<HTMLElement | null>(null)
let provider: TooltipProvider | undefined

const call = <T,>(key: CmdKey<T>, payload?: T) => {
  getEditor()?.action(callCommand(key, payload))
}

const buttons = computed(() => {
  const en = isEnglish.value
  return [
    { svg: I.bold, title: en ? 'Bold' : '加粗', run: () => call(toggleStrongCommand.key) },
    { svg: I.italic, title: en ? 'Italic' : '斜体', run: () => call(toggleEmphasisCommand.key) },
    { svg: I.strike, title: en ? 'Strikethrough' : '删除线', run: () => call(toggleStrikethroughCommand.key) },
    { svg: I.code, title: en ? 'Inline code' : '行内代码', run: () => call(toggleInlineCodeCommand.key) }
  ]
})

onMounted(() => {
  provider = new TooltipProvider({
    content: divRef.value as HTMLElement,
    offset: 8
  })
  provider.update(view.value, prevState.value)
})

watch([view, prevState], () => {
  provider?.update(view.value, prevState.value)
})

onBeforeUnmount(() => {
  provider?.destroy()
})
</script>

<template>
  <!-- Appended out of Vue's tree by TooltipProvider; visibility via data-show. -->
  <div ref="divRef" class="kun-editor__bubble" data-show="false">
    <button
      v-for="(b, i) in buttons"
      :key="i"
      type="button"
      class="kun-editor__bubble-btn"
      :title="b.title"
      :aria-label="b.title"
      @mousedown.prevent="b.run()"
    >
      <span class="kun-editor__icon" v-html="b.svg" />
    </button>
  </div>
</template>
