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
import { computed, provide, ref } from 'vue'
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
import type { KunEditorExpose } from '../types'

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
    /** Placeholder text shown while the editor is empty. */
    placeholder?: string
  }>(),
  {
    adapters: () => ({}),
    features: () => ({}),
    locale: 'zh-cn',
    readonly: false,
    placeholder: ''
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
  }
})

// Per-instance view mode — NOT a module-level singleton (the forum's atom.ts
// shared one `activeTab` across every editor, which would cross-wire two editors
// on the same page).
type ViewMode = 'wysiwyg' | 'source' | 'split'
const mode = ref<ViewMode>('wysiwyg')
const setMode = (m: ViewMode) => {
  mode.value = m
}
// Split-view left/right order (source ↔ preview).
const swapped = ref(false)
const swap = () => {
  swapped.value = !swapped.value
}

const isEnglish = computed(() => props.locale.toLowerCase().startsWith('en'))
const labels = computed(() =>
  isEnglish.value
    ? { wysiwyg: 'Preview', source: 'Markdown', split: 'Split', swap: 'Swap sides' }
    : { wysiwyg: '预览', source: 'Markdown', split: '分栏', swap: '左右互换' }
)

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
  <div class="kun-editor" data-kun-editor :data-mode="mode">
    <!-- The view switch (预览 / Markdown / 分栏 + swap). Override the #view-switch
         slot to swap the hand-rolled tabs for e.g. a KunUI <KunTab>. -->
    <slot
      name="view-switch"
      :mode="mode"
      :set-mode="setMode"
      :labels="labels"
      :swapped="swapped"
      :swap="swap"
    >
      <div class="kun-editor__toolbar" role="tablist">
        <button
          type="button"
          class="kun-editor__tab"
          :aria-selected="mode === 'wysiwyg'"
          :data-active="mode === 'wysiwyg'"
          @click="setMode('wysiwyg')"
        >
          {{ labels.wysiwyg }}
        </button>
        <button
          type="button"
          class="kun-editor__tab"
          :aria-selected="mode === 'source'"
          :data-active="mode === 'source'"
          @click="setMode('source')"
        >
          {{ labels.source }}
        </button>
        <button
          type="button"
          class="kun-editor__tab"
          :aria-selected="mode === 'split'"
          :data-active="mode === 'split'"
          @click="setMode('split')"
        >
          {{ labels.split }}
        </button>
        <button
          v-if="mode === 'split'"
          type="button"
          class="kun-editor__tab kun-editor__swap"
          :title="labels.swap"
          :aria-label="labels.swap"
          @click="swap()"
        >
          ⇄
        </button>
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
              @update:model-value="onUpdate"
            />
          </div>
        </div>
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  </div>
</template>
