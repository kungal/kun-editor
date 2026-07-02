<script setup lang="ts">
// <KunEditor> — the multi-view editor over one bound `v-model` markdown string:
// a Milkdown WYSIWYG view, a CodeMirror markdown-source view, and a desktop
// SPLIT view (editable source + live read-only WYSIWYG preview, left/right
// swappable). The markdown string is the single source of truth — the split's
// preview is derived (the industry-standard model: VS Code / StackEdit /
// Dillinger), so there's no two-editor bidirectional-sync problem.
//
// Wraps the Milkdown/ProseMirror providers and delegates to <MilkdownEditor>
// (which must live inside them). Also forwards <MilkdownEditor>'s imperative
// handle (insertQuote / insertMention / focus).
import { MilkdownProvider } from '@milkdown/vue'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/vue'
import { computed, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
import type {
  KunEditorAdapters,
  KunEditorFeatures,
  KunEditorLocale
} from '@kungal/editor-core'
import MilkdownEditor from './MilkdownEditor.vue'
import EditorToolbar from './EditorToolbar.vue'
import ToolbarHost from './ToolbarHost.vue'
import MarkdownSource from './MarkdownSource.vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import type { KunEditorExpose, KunSelectionItem } from '../types'

const DEFAULT_SELECTION_ITEMS: KunSelectionItem[] = [
  'bold',
  'italic',
  'strike',
  'code'
]

type ViewMode = 'wysiwyg' | 'source' | 'split'

const props = withDefaults(
  defineProps<{
    /** Bound markdown (v-model). */
    modelValue: string
    /** Policy: where uploads go, how mentions resolve, how toasts show. */
    adapters?: KunEditorAdapters
    /** Which optional plugins to enable (absent adapters win over `true`). */
    features?: KunEditorFeatures
    /** UI language for toolbar labels / placeholders. */
    locale?: KunEditorLocale
    /** Read-only render (no editing). */
    readonly?: boolean
    /** Placeholder text shown while empty. */
    placeholder?: string
    /**
     * When the placeholder shows: `'doc'` (default) only while the whole editor
     * is empty (the conventional empty-state hint); `'block'` on any empty block
     * at the cursor (Notion style — a hint on every new empty line).
     */
    placeholderMode?: 'doc' | 'block'
    /**
     * Which view modes to offer in the switch. Default all three. Drop `'split'`
     * (or use just `['wysiwyg']`) for compact editors like a reply/comment box —
     * a single-mode `views` hides the switch bar entirely.
     */
    views?: ViewMode[]
    /** Sync scrolling between the split panes. Default `true`; set `false` to
     * disable (or toggle it at runtime via the view-switch API). */
    scrollSync?: boolean
    /**
     * The floating toolbar shown on text selection. `true` (default) = the
     * standard buttons; `false` = off; or pass an ordered `KunSelectionItem[]`
     * to reorder / subset them (`'|'` is a divider). Its look is styled via the
     * `.kun-editor__bubble` / `.kun-editor__bubble-btn` class hooks.
     */
    selectionToolbar?: boolean | KunSelectionItem[]
  }>(),
  {
    adapters: () => ({}),
    features: () => ({}),
    locale: 'zh-cn',
    readonly: false,
    placeholder: '',
    placeholderMode: 'doc',
    views: () => ['wysiwyg', 'source', 'split'],
    scrollSync: true,
    selectionToolbar: true
  }
)

const emit = defineEmits<{
  'update:modelValue': [markdown: string]
}>()

// Provide the adapters + locale to the plugin VIEWS (the @mention dropdown, and
// later the sticker picker). It MUST be provided here, not in <MilkdownEditor>:
// @prosemirror-adapter/vue renders those views as portals under
// <ProsemirrorAdapterProvider> (siblings of <MilkdownEditor>), so only an
// ancestor of that provider can reach them. Getters keep prop reactivity.
provide(KUN_EDITOR_CONTEXT, {
  get adapters() {
    return props.adapters
  },
  get features() {
    return props.features
  },
  get locale() {
    return props.locale
  },
  // The selection bubble is a plugin view (a portal sibling), so its item config
  // reaches it through this context, not props.
  get selectionToolbarItems() {
    return Array.isArray(props.selectionToolbar)
      ? props.selectionToolbar
      : DEFAULT_SELECTION_ITEMS
  }
})

// Whether to wire the selection bubble at all (false = off; true / array = on).
const selectionToolbarEnabled = computed(
  () => props.selectionToolbar !== false
)

// Per-instance view mode — NOT a module-level singleton (the forum's atom.ts
// shared one `activeTab` across every editor, which would cross-wire two editors
// on the same page). Start on the first offered view; if `views` later drops the
// active mode, fall back to the first.
const mode = ref<ViewMode>(
  props.views.includes('wysiwyg') ? 'wysiwyg' : (props.views[0] ?? 'wysiwyg')
)
const setMode = (m: ViewMode) => {
  mode.value = m
}
watch(
  () => props.views,
  (v) => {
    if (!v.includes(mode.value)) {
      mode.value = v[0] ?? 'wysiwyg'
    }
  }
)
// Split-view left/right order (source ↔ preview).
const swapped = ref(false)
const swap = () => {
  swapped.value = !swapped.value
}

// Split-view scroll sync — on by default (seeded from the prop), togglable at
// runtime so a host can offer an off switch (or just pass `:scroll-sync="false"`).
const scrollSyncOn = ref(props.scrollSync)
watch(
  () => props.scrollSync,
  (v) => {
    scrollSyncOn.value = v
  }
)
const toggleScrollSync = () => {
  scrollSyncOn.value = !scrollSyncOn.value
}

const isEnglish = computed(() => props.locale.toLowerCase().startsWith('en'))
const labels = computed(() =>
  isEnglish.value
    ? {
        wysiwyg: 'Preview',
        source: 'Markdown',
        split: 'Split',
        swap: 'Swap sides',
        scrollSync: 'Sync scroll'
      }
    : {
        wysiwyg: '预览',
        source: 'Markdown',
        split: '分栏',
        swap: '左右互换',
        scrollSync: '同步滚动'
      }
)

// ── Proportional scroll sync between the split panes ─────────────────────────
// Percentage-based (source ↔ preview line mapping is impractical here), with an
// "active pane" guard + idle timeout so the driven pane's echoed scroll event
// doesn't feed back into a loop. Needs the panes to scroll internally (the
// reference stylesheet gives them a bounded height in split mode).
const rootEl = ref<HTMLElement | null>(null)
let detachScroll: (() => void) | null = null
let activePane: Element | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null

const teardownScrollSync = () => {
  detachScroll?.()
  detachScroll = null
  activePane = null
}

const setupScrollSync = () => {
  teardownScrollSync()
  const root = rootEl.value
  if (!root) return
  const source = root.querySelector<HTMLElement>('.cm-scroller')
  const preview = root.querySelector<HTMLElement>('.kun-editor__wysiwyg')
  if (!source || !preview) return

  const handler = (which: HTMLElement, other: HTMLElement) => () => {
    if (activePane && activePane !== which) return // ignore the echoed scroll
    activePane = which
    const max = which.scrollHeight - which.clientHeight
    const ratio = max > 0 ? which.scrollTop / max : 0
    const otherMax = other.scrollHeight - other.clientHeight
    other.scrollTop = ratio * (otherMax > 0 ? otherMax : 0)
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      activePane = null
    }, 120)
  }
  const onSource = handler(source, preview)
  const onPreview = handler(preview, source)
  source.addEventListener('scroll', onSource, { passive: true })
  preview.addEventListener('scroll', onPreview, { passive: true })
  detachScroll = () => {
    source.removeEventListener('scroll', onSource)
    preview.removeEventListener('scroll', onPreview)
  }
}

watch([mode, scrollSyncOn], ([m, on]) => {
  teardownScrollSync()
  if (m === 'split' && on) {
    nextTick(setupScrollSync)
  }
})
onBeforeUnmount(teardownScrollSync)

// The WYSIWYG is a read-only live preview in split mode (source is the editor).
const wysiwygReadonly = computed(() => props.readonly || mode.value === 'split')

const onUpdate = (markdown: string) => emit('update:modelValue', markdown)

// Forward the WYSIWYG editor's imperative handle. The inner editor stays mounted
// (v-show) in source mode too, so these work regardless of the active view.
const inner = ref<InstanceType<typeof MilkdownEditor> | null>(null)
defineExpose<KunEditorExpose>({
  insertQuote: (payload) => inner.value?.insertQuote(payload),
  insertMention: (payload) => inner.value?.insertMention(payload),
  focus: () => inner.value?.focus()
})
</script>

<template>
  <div ref="rootEl" class="kun-editor" data-kun-editor :data-mode="mode">
    <!-- The view switch (预览 / Markdown / 分栏 + swap + scroll-sync). Override the
         #view-switch slot to swap the hand-rolled tabs for e.g. a KunUI <KunTab>. -->
    <slot
      name="view-switch"
      :mode="mode"
      :set-mode="setMode"
      :labels="labels"
      :views="views"
      :swapped="swapped"
      :swap="swap"
      :scroll-sync="scrollSyncOn"
      :toggle-scroll-sync="toggleScrollSync"
    >
      <!-- Hidden entirely when only one view is offered (e.g. a reply box). -->
      <div v-if="views.length > 1" class="kun-editor__toolbar" role="tablist">
        <button
          v-for="v in views"
          :key="v"
          type="button"
          class="kun-editor__tab"
          :aria-selected="mode === v"
          :data-active="mode === v"
          @click="setMode(v)"
        >
          {{ labels[v] }}
        </button>
        <template v-if="mode === 'split'">
          <button
            type="button"
            class="kun-editor__tab kun-editor__swap"
            :title="labels.swap"
            :aria-label="labels.swap"
            @click="swap()"
          >
            ⇄
          </button>
          <button
            type="button"
            class="kun-editor__tab"
            :data-active="scrollSyncOn"
            :title="labels.scrollSync"
            :aria-pressed="scrollSyncOn"
            @click="toggleScrollSync()"
          >
            {{ labels.scrollSync }}
          </button>
        </template>
      </div>
    </slot>

    <!-- WYSIWYG stays mounted (v-show) so editor state survives a view switch.
         The format toolbar edits the WYSIWYG, so it's hidden in source/split
         (where the WYSIWYG is a read-only preview) and when read-only. -->
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <div v-show="mode === 'wysiwyg' && !readonly">
          <ToolbarHost>
            <template #default="api">
              <slot name="toolbar" v-bind="api"><EditorToolbar /></slot>
            </template>
          </ToolbarHost>
        </div>

        <!-- Panes: a single column normally, a flex row in split mode (styled by
             the host stylesheet via .kun-editor__panes / [data-mode='split']). -->
        <div class="kun-editor__panes" :data-swap="swapped">
          <!-- Source: editable + the source of truth. Mounted on demand (v-if):
               CodeMirror measures poorly while display:none. -->
          <MarkdownSource
            v-if="mode === 'source' || mode === 'split'"
            class="kun-editor__pane"
            :model-value="modelValue"
            :readonly="readonly"
            @update:model-value="onUpdate"
          />
          <div
            v-show="mode === 'wysiwyg' || mode === 'split'"
            class="kun-editor__wysiwyg kun-editor__pane"
          >
            <MilkdownEditor
              ref="inner"
              :model-value="modelValue"
              :adapters="adapters"
              :features="features"
              :locale="locale"
              :readonly="wysiwygReadonly"
              :placeholder="placeholder"
              :placeholder-mode="placeholderMode"
              :selection-toolbar="selectionToolbarEnabled"
              @update:model-value="onUpdate"
            />
          </div>
        </div>
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  </div>
</template>
