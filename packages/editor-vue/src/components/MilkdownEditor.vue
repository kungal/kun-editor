<script setup lang="ts">
// The WYSIWYG half of <KunEditor>: a real Milkdown editor built from
// @kungal/editor-core's composed plugin bundle. Must live inside
// <MilkdownProvider> + <ProsemirrorAdapterProvider> (KunEditor.vue supplies
// them) because useEditor reads that context.
//
// Ported from the forum's Editor.vue, minus the forum-specific bits (disableImage
// flag, pendingQuote) — those are now expressed as adapters/features on the core
// bundle. The @mention dropdown / sticker picker / rich toolbar (the parts that
// need @kungal/ui-vue) are follow-up P3 increments; this increment is the editor
// itself, which needs no host UI kit.
import { Editor, defaultValueCtx, editorViewOptionsCtx, rootCtx } from '@milkdown/kit/core'
import { listenerCtx } from '@milkdown/kit/plugin/listener'
import { slashFactory } from '@milkdown/kit/plugin/slash'
import { replaceAll } from '@milkdown/kit/utils'
import { Milkdown, useEditor } from '@milkdown/vue'
import { usePluginViewFactory } from '@prosemirror-adapter/vue'
import { createKunEditorPlugins } from '@kungal/editor-core/preset'
import type {
  KunEditorAdapters,
  KunEditorFeatures,
  KunEditorLocale
} from '@kungal/editor-core'
import { watch } from 'vue'
import MentionDropdown from './MentionDropdown.vue'

const props = defineProps<{
  modelValue: string
  adapters: KunEditorAdapters
  features: KunEditorFeatures
  locale: KunEditorLocale
  readonly: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [markdown: string]
}>()

// The markdown the editor last emitted. Lets the modelValue watch below tell an
// EXTERNAL change (a parent replacing the bound value) from the editor's own
// edits, so only the former triggers a replaceAll — the latter would reset the
// cursor on every keystroke.
let lastEmitted = props.modelValue

// The @mention dropdown is a render-layer VIEW: wire it only when the mention
// feature is on AND the host supplies searchMentionUsers (no adapter → the
// mention schema still round-trips, just no autocomplete). The dropdown reads
// the adapter via the KunEditor context (provided by the outer component).
const pluginViewFactory = usePluginViewFactory()
const mentionSlash = slashFactory('kunMention')
const mentionEnabled =
  props.features.mention !== false &&
  !!props.adapters.searchMentionUsers &&
  !!pluginViewFactory

const editorInfo = useEditor((root) => {
  const editor = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.modelValue)

      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
        if (markdown !== prevMarkdown) {
          lastEmitted = markdown
          emit('update:modelValue', markdown)
        }
      })

      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        editable: () => !props.readonly
      }))

      if (mentionEnabled) {
        ctx.set(mentionSlash.key, {
          view: pluginViewFactory!({ component: MentionDropdown })
        })
      }
    })
    .use(
      createKunEditorPlugins(props.adapters, props.features, {
        locale: props.locale
      })
    )

  if (mentionEnabled) {
    editor.use(mentionSlash)
  }

  return editor
})

// Re-sync the doc when modelValue changes from OUTSIDE the editor (a parent
// replacing the bound value). Guarded by lastEmitted so the editor's own edits
// (which round-trip back through v-model) don't trigger a replaceAll.
watch(
  () => props.modelValue,
  (val) => {
    if (val === lastEmitted) {
      return
    }
    lastEmitted = val
    editorInfo.get()?.action(replaceAll(val))
  }
)
</script>

<template>
  <Milkdown />
</template>
