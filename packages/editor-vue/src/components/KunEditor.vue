<script setup lang="ts">
// <KunEditor> — the dual-mode editor component (WYSIWYG preview + markdown
// source), the public face of KunEditor.
//
// STATUS: scaffold. This declares the stable prop/emit surface a host binds to;
// the Milkdown wiring is ported from the forum's DualEditorProvider + Editor.vue
// on top of @kungal/editor-core (see docs/architecture.md § migration). The
// prop shape here is what will not churn.
import type {
  KunEditorAdapters,
  KunEditorFeatures,
  KunEditorLocale
} from '@kungal/editor-core'

const props = withDefaults(
  defineProps<{
    /** Bound markdown (v-model:markdown). */
    modelValue: string
    /** Policy: where uploads go, how mentions resolve, how toasts show. */
    adapters?: KunEditorAdapters
    /** Which optional plugins to enable (absent adapters win over `true`). */
    features?: KunEditorFeatures
    /** UI language for toolbar labels / placeholders. */
    locale?: KunEditorLocale
    /** Read-only render (no toolbar, no editing). */
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

// Placeholder passthrough until the Milkdown editor is wired. Keeps v-model
// working end-to-end so hosts can integrate against the real contract now.
const onInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}

// Referenced so the scaffold typechecks against the full prop surface; the port
// replaces this with the real Milkdown config derived from these.
void props.adapters
void props.features
void props.locale
</script>

<template>
  <!-- Scaffold fallback: a plain textarea keeping v-model live until the
       Milkdown WYSIWYG + markdown-source dual view is ported in. -->
  <div class="kun-editor" data-kun-editor>
    <textarea
      class="kun-editor__fallback"
      :value="modelValue"
      :readonly="readonly"
      :lang="locale"
      @input="onInput"
    />
  </div>
</template>
