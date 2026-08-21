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
  linkSchema,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand
} from '@milkdown/kit/preset/commonmark'
import { toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import { insertLinkCommand } from '@kungal/editor-core/preset'
import type { CmdKey } from '@milkdown/kit/core'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EMPTY_ACTIVE_MARKS } from '../active-marks'
import { KUN_EDITOR_CONTEXT } from '../context'
import type { KunToggleMark } from '../types'
import { TOOLBAR_ICONS as I } from '../toolbar-icons'

const { view, prevState } = usePluginViewContext()
const [, getEditor] = useInstance()
const ctx = inject(KUN_EDITOR_CONTEXT)
const activeMarks = ctx?.activeMarks ?? EMPTY_ACTIVE_MARKS
const isEnglish = computed(() =>
  (ctx?.locale ?? 'zh-cn').toLowerCase().startsWith('en')
)
const t = computed(() => {
  const en = isEnglish.value
  return {
    bold: en ? 'Bold' : '加粗',
    italic: en ? 'Italic' : '斜体',
    strike: en ? 'Strikethrough' : '删除线',
    code: en ? 'Inline code' : '行内代码',
    link: en ? 'Link' : '链接',
    linkUrl: en ? 'Link URL' : '链接 URL',
    apply: en ? 'Apply' : '确定',
    cancel: en ? 'Cancel' : '取消'
  }
})

const divRef = ref<HTMLElement | null>(null)
let provider: TooltipProvider | undefined

const call = <T,>(key: CmdKey<T>, payload?: T) => {
  getEditor()?.action(callCommand(key, payload))
}

// ── Link entry ──────────────────────────────────────────────────────────────
// Asking for the URL happens INSIDE the bubble: the button row swaps for a URL
// input (Notion / TipTap style). Deliberately NOT a popover or dialog — the
// bubble is a Milkdown tooltip whose default shouldShow keeps it alive only
// while focus is in the editor OR inside `.kun-editor__bubble` itself, so a
// second floating layer (which any popover teleports to <body>) would hide the
// bubble the moment its input took focus. Our own input is inside the element,
// so the bubble stays put and the ProseMirror selection survives the DOM blur —
// `insertLinkCommand` still wraps exactly what the user selected.
const editingLink = ref(false)
const linkUrl = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

/** The href already on the selection, so editing a link prefills instead of
 * starting blank (`addMark` then replaces it). '' when the selection is plain. */
const selectedHref = () => {
  let href = ''
  getEditor()?.action((c) => {
    const state = view.value?.state
    if (!state) {
      return
    }
    const type = linkSchema.type(c)
    const { from, to } = state.selection
    state.doc.nodesBetween(from, to, (node) => {
      if (href) {
        return false
      }
      const mark = type.isInSet(node.marks)
      if (mark) {
        href = String(mark.attrs.href ?? '')
      }
      return true
    })
  })
  return href
}

const closeLinkEditor = () => {
  editingLink.value = false
  linkUrl.value = ''
  // Hand focus back so the bubble tracks the selection again (and the caret is
  // where the user left it).
  view.value?.focus()
}

const applyLink = () => {
  const href = linkUrl.value.trim()
  if (href) {
    call(insertLinkCommand.key, { href })
  }
  closeLinkEditor()
}

// The host's `linkPrompt` adapter (its own modal / article picker) still wins —
// one override covers the toolbar and the bubble alike.
const openLinkEditor = async () => {
  const linkPrompt = ctx?.adapters.linkPrompt
  if (linkPrompt) {
    const v = view.value
    const { from, to } = v?.state.selection ?? { from: 0, to: 0 }
    const raw = await linkPrompt({
      text: v ? v.state.doc.textBetween(from, to, ' ') : ''
    })
    const href = raw?.trim()
    if (href) {
      call(insertLinkCommand.key, { href })
    }
    return
  }
  linkUrl.value = selectedHref()
  editingLink.value = true
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

interface BubbleButton {
  svg: string
  title: string
  run: () => void
  mark?: KunToggleMark
}
type BubbleItem = { divider: true } | ({ divider: false } & BubbleButton)

// The available bubble buttons, keyed by KunSelectionItem id.
const commandMap = computed<Record<string, BubbleButton>>(() => ({
  bold: { svg: I.bold, title: t.value.bold, run: () => call(toggleStrongCommand.key), mark: 'bold' },
  italic: { svg: I.italic, title: t.value.italic, run: () => call(toggleEmphasisCommand.key), mark: 'italic' },
  strike: { svg: I.strike, title: t.value.strike, run: () => call(toggleStrikethroughCommand.key), mark: 'strike' },
  code: { svg: I.code, title: t.value.code, run: () => call(toggleInlineCodeCommand.key), mark: 'code' },
  link: { svg: I.link, title: t.value.link, run: openLinkEditor }
}))

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
  // A hidden bubble must not come back holding a half-typed URL for a selection
  // that is long gone.
  provider.onHide = () => {
    editingLink.value = false
    linkUrl.value = ''
  }
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
  <div
    ref="divRef"
    class="kun-editor__bubble"
    data-show="false"
    :data-mode="editingLink ? 'link' : 'marks'"
  >
    <template v-if="editingLink">
      <!-- No <form>: the editor is often rendered inside the host's own form,
           and nested forms are invalid HTML. Enter / Esc do the same job. -->
      <input
        ref="inputRef"
        v-model="linkUrl"
        type="url"
        class="kun-editor__bubble-input"
        :placeholder="t.linkUrl"
        :aria-label="t.linkUrl"
        spellcheck="false"
        autocomplete="off"
        @keydown.enter.prevent="applyLink()"
        @keydown.esc.stop.prevent="closeLinkEditor()"
      />
      <button
        type="button"
        class="kun-editor__bubble-btn"
        :title="t.apply"
        :aria-label="t.apply"
        @mousedown.prevent="applyLink()"
      >
        <span class="kun-editor__icon" v-html="I.check" />
      </button>
      <button
        type="button"
        class="kun-editor__bubble-btn"
        :title="t.cancel"
        :aria-label="t.cancel"
        @mousedown.prevent="closeLinkEditor()"
      >
        <span class="kun-editor__icon" v-html="I.close" />
      </button>
    </template>

    <template v-else>
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
          :aria-pressed="it.mark ? activeMarks[it.mark] : undefined"
          :data-active="it.mark ? activeMarks[it.mark] : undefined"
          @mousedown.prevent="it.run()"
        >
          <span class="kun-editor__icon" v-html="it.svg" />
        </button>
      </template>
    </template>
  </div>
</template>
