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
import { insertLinkCommand } from '@kungal/editor-core/preset'
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

// Link needs a URL. The bubble only shows on a non-empty selection, so this wraps
// the selected text. Headless: a native prompt (the KunUI toolbar uses a popover).
const promptLink = () => {
  const url = window.prompt(isEnglish.value ? 'Link URL' : '链接 URL')?.trim()
  if (url) {
    call(insertLinkCommand.key, { href: url })
  }
}

interface BubbleButton {
  svg: string
  title: string
  run: () => void
}
type BubbleItem = { divider: true } | ({ divider: false } & BubbleButton)

// The available bubble buttons, keyed by KunSelectionItem id.
const commandMap = computed<Record<string, BubbleButton>>(() => {
  const en = isEnglish.value
  return {
    bold: { svg: I.bold, title: en ? 'Bold' : '加粗', run: () => call(toggleStrongCommand.key) },
    italic: { svg: I.italic, title: en ? 'Italic' : '斜体', run: () => call(toggleEmphasisCommand.key) },
    strike: { svg: I.strike, title: en ? 'Strikethrough' : '删除线', run: () => call(toggleStrikethroughCommand.key) },
    code: { svg: I.code, title: en ? 'Inline code' : '行内代码', run: () => call(toggleInlineCodeCommand.key) },
    link: { svg: I.link, title: en ? 'Link' : '链接', run: promptLink }
  }
})

// Resolve the configured items (from the KunEditor context) → renderables, with
// dividers collapsed around any unknown/removed item.
const items = computed<BubbleItem[]>(() => {
  const map = commandMap.value
  const configured = ctx?.selectionToolbarItems ?? ['bold', 'italic', 'strike', 'code', 'link']
  const mapped = configured
    .map<BubbleItem | null>((it) =>
      it === '|'
        ? { divider: true }
        : map[it]
          ? { divider: false, ...map[it] }
          : null
    )
    .filter((x): x is BubbleItem => x !== null)

  const out: BubbleItem[] = []
  for (const it of mapped) {
    if (it.divider && (out.length === 0 || out[out.length - 1]?.divider)) continue
    out.push(it)
  }
  while (out.length && out[out.length - 1]?.divider) out.pop()
  return out
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
    <template v-for="(it, i) in items" :key="i">
      <span
        v-if="it.divider"
        class="kun-editor__toolbar-divider"
        aria-hidden="true"
      />
      <button
        v-else
        type="button"
        class="kun-editor__bubble-btn"
        :title="it.title"
        :aria-label="it.title"
        @mousedown.prevent="it.run()"
      >
        <span class="kun-editor__icon" v-html="it.svg" />
      </button>
    </template>
  </div>
</template>
