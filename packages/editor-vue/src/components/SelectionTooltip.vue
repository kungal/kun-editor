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
import { editorViewCtx } from '@milkdown/kit/core'
import { NodeSelection, TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import {
  linkAtSelection,
  linkDraft,
  removeLinkCommand,
  selectedEntity,
  setLinkCommand
} from '@kungal/editor-core/preset'
import type { Middleware } from '@floating-ui/dom'
import { usePluginViewContext } from '@prosemirror-adapter/vue'
import { useInstance } from '@milkdown/vue'
import { callCommand } from '@milkdown/kit/utils'
import {
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand
} from '@milkdown/kit/preset/commonmark'
import { toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import { insertKunSpoilerCommand } from '@kungal/editor-core/preset'
import type { CmdKey } from '@milkdown/kit/core'
import { computed, inject, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { EMPTY_ACTIVE_MARKS } from '../active-marks'
import { DEFAULT_SELECTION_ITEMS, KUN_EDITOR_CONTEXT } from '../context'
import type { KunToggleMark } from '../types'
import { TOOLBAR_ICONS as I } from '../toolbar-icons'
import { onVisualViewportChange, visualViewportClamp } from '../entity-shared'
import { askLinkPrompt, KUN_LINK_EDITOR_EVENT } from '../link-shared'
import LinkEditor from './LinkEditor.vue'
import type { KunLinkDraft } from './LinkEditor.vue'

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
    spoiler: en ? 'Spoiler' : '隐藏文本',
    link: en ? 'Link (Ctrl+K)' : '链接(Ctrl+K)'
  }
})

const divRef = ref<HTMLElement | null>(null)
let provider: TooltipProvider | undefined

// ── Motion ──────────────────────────────────────────────────────────────────
// The look lives in the stylesheet (enter: fade + 4px rise + .98 → 1; leave
// faster; none under reduced motion). Two flags on the element steer it, set
// synchronously so they land in the same frame as `data-show`:
// - `data-glide`: the bubble was already showing when the selection moved, so
//   left/top glide to the new spot — and the enter animation does not re-run
//   for every Shift+arrow;
// - `data-instant`: focus left for another field — gone at once, no fade, so
//   it never lingers over whatever the user went to.
let shown = false
const setFlag = (name: 'glide' | 'instant', on: boolean) => {
  divRef.value?.toggleAttribute(`data-${name}`, on)
}

/** The live view (the plugin-view `view` is a per-update snapshot). */
const liveView = () => {
  let live: EditorView | undefined
  getEditor()?.action((c) => {
    live = c.get(editorViewCtx)
  })
  return live ?? view.value
}

const call = <T,>(key: CmdKey<T>, payload?: T) => {
  getEditor()?.action(callCommand(key, payload))
}

// ── Link entry ──────────────────────────────────────────────────────────────
// The link editor (<LinkEditor>: 文本 + 链接) opens IN the bubble, in place of
// the button row — not as a popover or dialog: the bubble stays alive only
// while focus is in the editor or inside the bubble itself, so a layer
// teleported elsewhere would hide it the moment its field took focus. Inside,
// ProseMirror's selection survives the DOM blur, and the link lands on exactly
// what was selected. Two ways in:
// - ACTIVE: the link button, or Mod-K (with or without a selection) — focus
//   goes into the first empty field;
// - PASSIVE: the caret sits inside a link (a click on it) — the editor shows,
//   prefilled and kept in step with the document, but focus stays in the text
//   (a click on a link must still place the caret); clicking a field makes it
//   active.
// The bubble keeps its LEFT edge where the button row was and grows right
// and up (min 17rem), so opening it never jumps sideways.
type LinkMode = 'off' | 'passive' | 'active'
const linkMode = ref<LinkMode>('off')
const draft = shallowRef<KunLinkDraft>({ text: '', href: '', editing: false, textEditable: true })
/** Remounts the editor when it turns active, so it takes focus. */
const editorKey = ref(0)
/** The row's left (offset-parent px) to hold while the editor is open. */
let anchorX: number | null = null

const readDraft = (v: EditorView): KunLinkDraft => {
  const { text, href, editing, textEditable } = linkDraft(v.state)
  return { text, href, editing, textEditable }
}

const closeLink = (refocus = true) => {
  linkMode.value = 'off'
  anchorX = null
  if (divRef.value) divRef.value.style.minWidth = ''
  if (refocus) {
    // Focus back to the text: the bubble follows the selection again.
    const v = liveView()
    v?.focus()
    if (v) provider?.update(v)
  }
}

const openLinkEditor = async () => {
  const v = liveView()
  if (!v || !v.editable) return
  // The host's own UI (`linkPrompt`) wins over the built-in editor.
  const linkPrompt = ctx?.adapters.linkPrompt
  if (linkPrompt) {
    const answer = await askLinkPrompt(linkPrompt, linkDraft(v.state).text)
    if (answer) call(setLinkCommand.key, answer)
    liveView()?.focus()
    return
  }
  const el = divRef.value
  if (el && shown && linkMode.value === 'off') {
    anchorX = parseFloat(el.style.left)
    el.style.minWidth = `${el.offsetWidth}px`
  }
  draft.value = readDraft(v)
  linkMode.value = 'active'
  editorKey.value += 1
  provider?.update(v)
}

const activateLink = () => {
  if (linkMode.value === 'passive') linkMode.value = 'active'
}

const submitLink = (link: { text?: string; href: string }) => {
  call(setLinkCommand.key, link)
  closeLink()
}

const unlink = () => {
  call(removeLinkCommand.key)
  closeLink()
}

/** Hold the left edge while the editor is open (it is wider than the row):
 * runs after floating-ui's own shift; never past the viewport's right edge. */
const anchorLeft: Middleware = {
  name: 'kunAnchorLeft',
  fn: ({ rects, elements }) => {
    if (anchorX === null || Number.isNaN(anchorX)) return {}
    const parent = (elements.floating as HTMLElement).offsetParent ?? document.documentElement
    const parentLeft = parent.getBoundingClientRect().left
    const max = innerWidth - 8 - parentLeft - rects.floating.width
    return { x: Math.max(8 - parentLeft, Math.min(anchorX, max)) }
  }
}

/** Mod-K (see MilkdownEditor's keymap, which signals it on the editor DOM
 * once ProseMirror has read the latest selection). */
const onModK = () => {
  void openLinkEditor()
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
  spoiler: { svg: I.spoiler, title: t.value.spoiler, run: () => call(insertKunSpoilerCommand.key), mark: 'spoiler' },
  link: { svg: I.link, title: t.value.link, run: () => void openLinkEditor() }
}))

// Resolve the configured items (from the KunEditor context) → renderables, with
// dividers collapsed around any unknown/removed item.
const items = computed<BubbleItem[]>(() => {
  const map = commandMap.value
  const configured = ctx?.selectionToolbarItems ?? DEFAULT_SELECTION_ITEMS
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

// TooltipProvider's own rule (a non-empty selection, focused, editable), minus
// a selected entity card / chip: that one has its own bubble (EntityMenu), and
// bold / italic mean nothing on it.
const shouldShow = (v: EditorView): boolean => {
  const { selection, doc } = v.state
  const isTooltipChild = !!divRef.value?.contains(document.activeElement)
  if ((!v.hasFocus() && !isTooltipChild) || !v.editable) {
    return false
  }
  if (linkMode.value === 'active') {
    return true
  }
  if (selection.empty) {
    // A caret inside a link: its editor, shown without taking focus.
    if (linkAtSelection(v.state, true)) {
      draft.value = readDraft(v)
      linkMode.value = 'passive'
      return true
    }
    if (linkMode.value === 'passive') linkMode.value = 'off'
    return false
  }
  if (linkMode.value === 'passive') linkMode.value = 'off'
  if (selection instanceof NodeSelection && selectedEntity(v.state)) {
    return false
  }
  const emptyText =
    selection instanceof TextSelection &&
    !doc.textBetween(selection.from, selection.to).length
  return !emptyText
}

/** Focus went somewhere that is neither the editor nor this bubble. */
const leftForElsewhere = (event: FocusEvent) => {
  const to = event.relatedTarget as Node | null
  const v = liveView()
  if (to && (divRef.value?.contains(to) || v?.dom.contains(to))) {
    return
  }
  if (shown) {
    setFlag('instant', true)
    provider?.hide()
  }
}
/** Back in the editor: ProseMirror dispatches nothing on focus, so ask the
 * provider to look again (a selection may be waiting for its bubble). */
const backInEditor = () => {
  const v = liveView()
  if (v) provider?.update(v)
}
let editorDom: HTMLElement | null = null

onMounted(() => {
  provider = new TooltipProvider({
    content: divRef.value as HTMLElement,
    offset: 8,
    shift: { padding: 8 },
    middleware: [anchorLeft, visualViewportClamp()],
    // Follow the selection closely (Milkdown's default is 200ms) — the glide
    // smooths it; a long throttle only makes it lag, then jump.
    debounce: 50,
    shouldShow
  })
  provider.onShow = () => {
    setFlag('instant', false)
    setFlag('glide', shown)
    shown = true
  }
  // A hidden bubble must not come back holding a half-typed link for a
  // selection that is long gone.
  provider.onHide = () => {
    shown = false
    setFlag('glide', false)
    closeLink(false)
  }
  provider.update(view.value, prevState.value)
  editorDom = liveView()?.dom ?? null
  editorDom?.addEventListener('blur', leftForElsewhere)
  editorDom?.addEventListener('focus', backInEditor)
  divRef.value?.addEventListener('focusout', leftForElsewhere)
  editorDom?.addEventListener(KUN_LINK_EDITOR_EVENT, onModK)
  stopViewport = onVisualViewportChange(() => {
    const v = liveView()
    if (v && shown) provider?.update(v)
  })
})
let stopViewport: () => void = () => {}

watch([view, prevState], () => {
  provider?.update(view.value, prevState.value)
})

onBeforeUnmount(() => {
  editorDom?.removeEventListener('blur', leftForElsewhere)
  editorDom?.removeEventListener('focus', backInEditor)
  divRef.value?.removeEventListener('focusout', leftForElsewhere)
  editorDom?.removeEventListener(KUN_LINK_EDITOR_EVENT, onModK)
  stopViewport()
  provider?.destroy()
})
</script>

<template>
  <!-- Appended out of Vue's tree by TooltipProvider; visibility via data-show. -->
  <div
    ref="divRef"
    class="kun-editor__bubble"
    data-show="false"
    :data-mode="linkMode === 'off' ? 'marks' : 'link'"
  >
    <LinkEditor
      v-if="linkMode !== 'off'"
      :key="editorKey"
      :draft="draft"
      :locale="ctx?.locale"
      :autofocus="linkMode === 'active'"
      @focusin="activateLink"
      @submit="submitLink"
      @cancel="closeLink()"
      @unlink="unlink"
    />

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
