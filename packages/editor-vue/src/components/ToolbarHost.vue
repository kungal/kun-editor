<script setup lang="ts">
// Computes the toolbar command API INSIDE the Milkdown providers and hands it to
// the #toolbar slot as scoped props. This is the key to keeping the editor
// headless: a custom toolbar (KunUI or your own) lives in the CONSUMER's tree —
// it can't useInstance()/inject() the editor — so it drives the editor purely
// through these props. The default hand-rolled toolbar is the slot's fallback.
import { editorViewCtx } from '@milkdown/kit/core'
import type { CmdKey } from '@milkdown/kit/core'
import { callCommand } from '@milkdown/kit/utils'
import { useInstance } from '@milkdown/vue'
import { inject } from 'vue'
import { insertImageCommand } from '@milkdown/kit/preset/commonmark'
import {
  insertLinkCommand,
  insertMentionCommand,
  insertQuoteCommand,
  startImageUpload
} from '@kungal/editor-core/preset'
import { KUN_EDITOR_CONTEXT } from '../context'
import type { KunEditorToolbarApi } from '../types'

const [, getEditor] = useInstance()
const ctx = inject(KUN_EDITOR_CONTEXT, undefined)

const run = <T,>(key: CmdKey<T>, payload?: T): void => {
  getEditor()?.action(callCommand(key, payload))
}
const focus = (): void => {
  getEditor()?.action((c) => c.get(editorViewCtx).focus())
}
const insertText = (text: string): void => {
  getEditor()?.action((c) => {
    const view = c.get(editorViewCtx)
    view.dispatch(view.state.tr.insertText(text))
  })
  focus()
}
const insertLink: KunEditorToolbarApi['insertLink'] = (payload) => {
  run(insertLinkCommand.key, payload)
  focus()
}
const insertImage: KunEditorToolbarApi['insertImage'] = (payload) => {
  run(insertImageCommand.key, {
    src: payload.src,
    alt: payload.alt ?? '',
    title: payload.title ?? ''
  })
  focus()
}
const insertQuote: KunEditorToolbarApi['insertQuote'] = (payload) => {
  run(insertQuoteCommand.key, payload)
  focus()
}
const insertMention: KunEditorToolbarApi['insertMention'] = (payload) => {
  run(insertMentionCommand.key, payload)
  focus()
}
const uploadImage: KunEditorToolbarApi['uploadImage'] = (file) => {
  const adapter = ctx?.adapters.uploadImage
  const editor = getEditor()
  if (!adapter || !editor) {
    return
  }
  editor.action((c) => {
    void startImageUpload(c.get(editorViewCtx), file, {
      uploadImage: adapter,
      notify: ctx?.adapters.notify,
      locale: ctx?.locale
    })
  })
}

const api: KunEditorToolbarApi = {
  run,
  insertText,
  uploadImage,
  insertLink,
  insertImage,
  insertQuote,
  insertMention,
  focus,
  get adapters() {
    return ctx?.adapters ?? {}
  },
  get features() {
    return ctx?.features ?? {}
  },
  get locale() {
    return ctx?.locale ?? 'zh-cn'
  }
}
</script>

<template>
  <slot v-bind="api" />
</template>
