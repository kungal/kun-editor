<script setup lang="ts">
// <KunEditor> — the dual-mode editor: a Milkdown WYSIWYG view plus a raw
// markdown-source view, over one bound `v-model` markdown string. The public
// face of KunEditor.
//
// This wraps the Milkdown/ProseMirror providers and delegates the actual editor
// to <MilkdownEditor> (which must live inside the providers). The prop surface is
// unchanged from the P0 scaffold — hosts that integrated against it keep working;
// the textarea fallback is now a real editor.
//
// P3 increment: the WYSIWYG + source dual view + v-model + adapters/features/
// readonly/locale. The rich formatting toolbar, @mention dropdown and sticker
// picker (which build on @kungal/ui-vue) are follow-up increments; the source
// view uses a plain <textarea> until the CodeMirror source view is ported.
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
import { KUN_EDITOR_CONTEXT } from '../context'

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
const onSourceInput = (e: Event) =>
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
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

    <textarea
      v-show="mode === 'source'"
      class="kun-editor__source"
      :value="modelValue"
      :readonly="readonly"
      :lang="locale"
      spellcheck="false"
      @input="onSourceInput"
    />
  </div>
</template>

<style>
.kun-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kun-editor__toolbar {
  display: flex;
  gap: 0.25rem;
}

.kun-editor__tab {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--color-default-200, #e4e4e7);
  border-radius: 0.5rem;
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.kun-editor__tab[data-active='true'] {
  background: var(--color-primary, #006fee);
  border-color: var(--color-primary, #006fee);
  color: #fff;
}

.kun-editor__wysiwyg .milkdown {
  outline: none;
}

.kun-editor__wysiwyg .ProseMirror {
  min-height: 8rem;
  padding: 0.75rem;
  border: 1px solid var(--color-default-200, #e4e4e7);
  border-radius: 0.5rem;
  outline: none;
  /* ProseMirror requires a whitespace rule; pre-wrap keeps wrapping + spaces. */
  white-space: pre-wrap;
  word-wrap: break-word;
}

.kun-editor__source {
  width: 100%;
  min-height: 8rem;
  padding: 0.75rem;
  border: 1px solid var(--color-default-200, #e4e4e7);
  border-radius: 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875rem;
  resize: vertical;
}
</style>
