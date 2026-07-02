<script setup lang="ts">
// The markdown-source half of <KunEditor>: a CodeMirror editor over the raw
// markdown, the dual view's "source" mode. Ported from the forum's
// codemirror/setup.ts + Codemirror.vue.
//
// Reuses the KUN CodeMirror theme (`kunCM`) from @kungal/editor-core — the same
// theme the code-block plugin uses, so source view and code blocks match. The
// CodeMirror packages are already required by the editor (the preset's code-block
// config imports them); this view adds only @codemirror/lang-markdown.
import { Annotation, EditorState } from '@codemirror/state'
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

// Marks the doc-replace we do for EXTERNAL v-model changes, so its docChanged
// doesn't re-emit (which would loop) — only real user edits emit.
const External = Annotation.define<boolean>()

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
        if (
          update.docChanged &&
          !update.transactions.some((tr) => tr.annotation(External))
        ) {
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

// Scroll to the index-th ATX heading LINE (order + code-fence handling match the
// parseHeadings outline) and put the caret there. The source counterpart of the
// WYSIWYG scrollToHeading — a host's TOC calls one or the other by view mode.
const FENCE = /^\s{0,3}(?:```|~~~)/
const ATX = /^ {0,3}#{1,6}\s+/
const scrollToHeading = (index: number) => {
  if (!view) {
    return
  }
  const { doc } = view.state
  let i = 0
  let inFence = false
  let targetFrom = -1
  for (let ln = 1; ln <= doc.lines; ln += 1) {
    const line = doc.line(ln)
    if (FENCE.test(line.text)) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      continue
    }
    if (ATX.test(line.text)) {
      if (i === index) {
        targetFrom = line.from
        break
      }
      i += 1
    }
  }
  if (targetFrom < 0) {
    return
  }
  view.dispatch({ selection: { anchor: targetFrom }, scrollIntoView: true })
  view.focus()
}

defineExpose({ scrollToHeading })

// External changes (a parent replacing the bound value) re-sync the doc. Apply
// as a content-replacing TRANSACTION (not setState) so the editor keeps its
// selection/undo history — the cursor is preserved (clamped to the new length)
// instead of jumping to the start. Guarded so the view's own edits don't loop.
watch(
  () => props.modelValue,
  (val) => {
    if (!view || view.state.doc.toString() === val) {
      return
    }
    const { anchor, head } = view.state.selection.main
    const len = val.length
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: val },
      selection: { anchor: Math.min(anchor, len), head: Math.min(head, len) },
      annotations: External.of(true)
    })
  }
)
</script>

<template>
  <div ref="host" class="kun-editor__source" />
</template>

