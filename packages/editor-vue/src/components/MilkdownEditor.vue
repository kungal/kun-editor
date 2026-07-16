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
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  rootCtx
} from '@milkdown/kit/core'
import { listenerCtx } from '@milkdown/kit/plugin/listener'
import { slashFactory } from '@milkdown/kit/plugin/slash'
import { tooltipFactory } from '@milkdown/kit/plugin/tooltip'
import { callCommand, replaceAll } from '@milkdown/kit/utils'
import { TextSelection } from '@milkdown/kit/prose/state'
import { Milkdown, useEditor } from '@milkdown/vue'
import { usePluginViewFactory } from '@prosemirror-adapter/vue'
import { insertImageCommand } from '@milkdown/kit/preset/commonmark'
import {
  createKunEditorPlugins,
  insertMentionCommand,
  insertQuoteCommand,
  startImageUpload
} from '@kungal/editor-core/preset'
import type {
  KunEditorAdapters,
  KunEditorFeatures,
  KunEditorLocale
} from '@kungal/editor-core'
import { watch } from 'vue'
import MentionDropdown from './MentionDropdown.vue'
import SelectionTooltip from './SelectionTooltip.vue'
import type { KunEditorExpose } from '../types'

const props = defineProps<{
  modelValue: string
  adapters: KunEditorAdapters
  features: KunEditorFeatures
  locale: KunEditorLocale
  readonly: boolean
  placeholder: string
  placeholderMode: 'doc' | 'block'
  selectionToolbar: boolean
  /**
   * Whether this WYSIWYG is the ACTIVE editor (source of truth). False in
   * source/split mode, where the CodeMirror source owns the raw markdown and this
   * is only a derived preview — so it must NOT emit its re-serialized markdown.
   */
  active: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [markdown: string]
  /** Milkdown's create/hydrate state — true until the editor is ready. */
  'update:loading': [loading: boolean]
}>()

// The markdown the editor last emitted. Lets the modelValue watch below tell an
// EXTERNAL change (a parent replacing the bound value) from the editor's own
// edits, so only the former triggers a replaceAll — the latter would reset the
// cursor on every keystroke.
let lastEmitted = props.modelValue
// True while we're applying an EXTERNAL value via replaceAll. Milkdown's
// markdownUpdated fires synchronously during that, with its own (re-serialized,
// possibly normalized) markdown — echoing it back would clobber whoever owns the
// value (notably the split source pane, resetting its cursor). So we suppress the
// emit for external applies; only genuine user edits emit.
let applyingExternal = false

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

// The selection bubble toolbar — a tooltip VIEW (same plugin-view mechanism as
// the mention dropdown). Wired when enabled; TooltipProvider itself only shows it
// on a non-empty selection while focused + editable (so it's inert when readonly
// / in the split preview).
const selectionTooltip = tooltipFactory('kunSelectionTooltip')
const tooltipEnabled = props.selectionToolbar && !!pluginViewFactory

const editorInfo = useEditor((root) => {
  const editor = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.modelValue)

      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
        // Only the ACTIVE wysiwyg editor is a source of truth. In source/split
        // mode the CodeMirror source owns the raw markdown; this Milkdown is a
        // derived preview, and its normalizing/escaping re-serialization must not
        // overwrite that raw text — that's what turned `>` into `> <br />` and
        // `~~`/`**` into `\~\~`/`\*\*`.
        if (!props.active || applyingExternal || markdown === prevMarkdown) {
          return
        }
        lastEmitted = markdown
        emit('update:modelValue', markdown)
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

      if (tooltipEnabled) {
        ctx.set(selectionTooltip.key, {
          view: pluginViewFactory!({ component: SelectionTooltip })
        })
      }
    })
    .use(
      createKunEditorPlugins(props.adapters, props.features, {
        locale: props.locale,
        placeholder: props.placeholder,
        placeholderMode: props.placeholderMode
      })
    )

  if (mentionEnabled) {
    editor.use(mentionSlash)
  }
  if (tooltipEnabled) {
    editor.use(selectionTooltip)
  }

  return editor
})

// Surface Milkdown's own loading state (Ref<boolean> from useEditor) so the outer
// component can show a placeholder while the editor hydrates/creates — the SSR gap
// where the WYSIWYG area is briefly empty.
watch(editorInfo.loading, (v) => emit('update:loading', v), { immediate: true })

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
    const editor = editorInfo.get()
    if (!editor) {
      return
    }
    applyingExternal = true
    editor.action(replaceAll(val))
    applyingExternal = false
  }
)

// `editable` reads props.readonly lazily, but ProseMirror only re-evaluates it on
// a view update — so toggling readonly (e.g. entering split mode, where the
// WYSIWYG becomes a read-only preview) needs a nudge. Dispatch an empty
// transaction to force the recompute.
watch(
  () => props.readonly,
  () => {
    editorInfo.get()?.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr)
    })
  }
)

// Imperative handle — cursor-level inserts (the forum's 「引用」 flow) + focus.
// Each command inserts at the current selection with a trailing space, so
// calling insertMention then insertQuote yields "@author #floor " at the caret.
const focus: KunEditorExpose['focus'] = () => {
  editorInfo.get()?.action((ctx) => ctx.get(editorViewCtx).focus())
}
const insertQuote: KunEditorExpose['insertQuote'] = (payload) => {
  editorInfo.get()?.action(callCommand(insertQuoteCommand.key, payload))
  focus()
}
const insertMention: KunEditorExpose['insertMention'] = (payload) => {
  editorInfo.get()?.action(callCommand(insertMentionCommand.key, payload))
  focus()
}
const insertImage: KunEditorExpose['insertImage'] = (payload) => {
  editorInfo.get()?.action(
    callCommand(insertImageCommand.key, {
      src: payload.src,
      alt: payload.alt ?? '',
      title: payload.title ?? ''
    })
  )
  focus()
}
const uploadImage: KunEditorExpose['uploadImage'] = (file) => {
  const adapter = props.adapters.uploadImage
  const editor = editorInfo.get()
  if (!adapter || !editor) {
    return
  }
  editor.action((ctx) => {
    void startImageUpload(ctx.get(editorViewCtx), file, {
      uploadImage: adapter,
      notify: props.adapters.notify,
      locale: props.locale
    })
  })
}

// Scroll the index-th TOP-LEVEL heading into view (order matches the parseHeadings
// outline), and — when editable — place the caret in it so editing continues
// there. WYSIWYG variant; the source pane has its own (line-based) one.
const scrollToHeading: KunEditorExpose['scrollToHeading'] = (index) => {
  editorInfo.get()?.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    let i = 0
    let target = -1
    view.state.doc.forEach((node, offset) => {
      if (node.type.name === 'heading') {
        if (i === index) {
          target = offset
        }
        i += 1
      }
    })
    if (target < 0) {
      return
    }
    const dom = view.nodeDOM(target) as HTMLElement | null
    dom?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (view.editable) {
      const sel = TextSelection.near(view.state.doc.resolve(target + 1))
      view.dispatch(view.state.tr.setSelection(sel))
      view.focus()
    }
  })
}

defineExpose<KunEditorExpose>({
  insertQuote,
  insertMention,
  insertImage,
  uploadImage,
  focus,
  scrollToHeading
})
</script>

<template>
  <Milkdown />
</template>
