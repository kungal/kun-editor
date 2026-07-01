<script setup lang="ts">
// <KunEditor> — the dual-mode editor: a Milkdown WYSIWYG view plus a raw
// markdown-source view, over one bound `v-model` markdown string. The public
// face of KunEditor.
//
// This wraps the Milkdown/ProseMirror providers and delegates the actual editor
// to <MilkdownEditor> (which must live inside the providers). It composes the
// WYSIWYG view, the formatting toolbar, the @mention dropdown / sticker picker,
// and the CodeMirror markdown-source view — over one `v-model`. It also forwards
// <MilkdownEditor>'s imperative handle (insertQuote / insertMention / focus) so a
// host can insert references at the caret via a template ref.
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
  }>(),
  {
    adapters: () => ({}),
    features: () => ({}),
    locale: 'zh-cn',
    readonly: false
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
type ViewMode = 'wysiwyg' | 'source'
const mode = ref<ViewMode>('wysiwyg')

const isEnglish = computed(() => props.locale.toLowerCase().startsWith('en'))
const labels = computed(() =>
  isEnglish.value
    ? { wysiwyg: 'Preview', source: 'Markdown' }
    : { wysiwyg: '预览', source: 'Markdown' }
)

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
  <div class="kun-editor" data-kun-editor>
    <div class="kun-editor__toolbar" role="tablist">
      <button
        type="button"
        class="kun-editor__tab"
        :aria-selected="mode === 'wysiwyg'"
        :data-active="mode === 'wysiwyg'"
        @click="mode = 'wysiwyg'"
      >
        {{ labels.wysiwyg }}
      </button>
      <button
        type="button"
        class="kun-editor__tab"
        :aria-selected="mode === 'source'"
        :data-active="mode === 'source'"
        @click="mode = 'source'"
      >
        {{ labels.source }}
      </button>
    </div>

    <!-- WYSIWYG stays mounted (v-show) so editor state survives a view switch.
         The format toolbar lives INSIDE the providers so it can useInstance()
         to reach the editor; it's hidden in source mode and when read-only. -->
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <EditorToolbar v-show="mode === 'wysiwyg' && !readonly" />
        <div v-show="mode === 'wysiwyg'" class="kun-editor__wysiwyg">
          <MilkdownEditor
            ref="inner"
            :model-value="modelValue"
            :adapters="adapters"
            :features="features"
            :locale="locale"
            :readonly="readonly"
            @update:model-value="onUpdate"
          />
        </div>
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>

    <!-- Source view is mounted on demand (v-if): CodeMirror measures poorly
         while display:none, so build it fresh each time source mode opens. -->
    <MarkdownSource
      v-if="mode === 'source'"
      :model-value="modelValue"
      :readonly="readonly"
      @update:model-value="onUpdate"
    />
  </div>
</template>

