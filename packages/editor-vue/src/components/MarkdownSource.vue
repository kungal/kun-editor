<script setup lang="ts">
// The markdown-source half of <KunEditor>: a CodeMirror editor over the raw
// markdown, the dual view's "source" mode. Ported from the forum's
// codemirror/setup.ts + Codemirror.vue.
//
// Reuses the KUN CodeMirror theme (`kunCM`) from @kungal/editor-core — the same
// theme the code-block plugin uses, so source view and code blocks match. The
// CodeMirror packages are already required by the editor (the preset's code-block
// config imports them); this view adds only @codemirror/lang-markdown.
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { basicSetup } from 'codemirror'
import { kunCM } from '@kungal/editor-core/preset'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  readonly: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [markdown: string]
}>()

const host = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null

const makeState = (doc: string) =>
  EditorState.create({
    doc,
    extensions: [
      kunCM(),
      EditorView.lineWrapping,
      basicSetup,
      markdown(),
      EditorView.editable.of(!props.readonly),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString())
        }
      })
    ]
  })

onMounted(() => {
  if (!host.value) {
    return
  }
  view = new EditorView({ state: makeState(props.modelValue), parent: host.value })
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

// External changes (WYSIWYG edits round-tripping through v-model) reset the doc;
// guarded so the view's own edits don't rebuild it and lose the cursor.
watch(
  () => props.modelValue,
  (val) => {
    if (view && view.state.doc.toString() !== val) {
      view.setState(makeState(val))
    }
  }
)
</script>

<template>
  <div ref="host" class="kun-editor__source" />
</template>

<style>
.kun-editor__source .cm-editor {
  border: 1px solid var(--color-default-200, #e4e4e7);
  border-radius: 0.5rem;
  overflow: hidden;
}
</style>
