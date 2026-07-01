# @kungal/editor-vue

The **Vue 3 render layer** of KunEditor: the `<KunEditor>` component (dual
WYSIWYG preview + markdown-source), its toolbar and the Vue plugin views
(mention dropdown, tooltip, sticker/emoji picker). Consumes
[`@kungal/editor-core`](../editor-core) for the plugin brain and pairs with
[`@kungal/ui-vue`](https://github.com/kungal/kun-ui) for the chrome.

Works in any Vue 3 app; `@kungal/editor-nuxt` adds Nuxt auto-import sugar.

## Usage

```vue
<script setup lang="ts">
import { KunEditor, type KunEditorAdapters } from '@kungal/editor-vue'
import '@kungal/editor-vue/style.css'

const markdown = ref('')

const adapters: KunEditorAdapters = {
  uploadImage: (file) => api.uploadTopicImage(file),
  searchMentionUsers: (q) => oauth.searchUsers(q),
  notify: (msg, level) => toast(msg, level)
}
</script>

<template>
  <KunEditor v-model="markdown" :adapters="adapters" locale="zh-cn" />
</template>
```

For an **image-free** editor (e.g. a short intro field), just omit
`uploadImage` — the upload button, paste/drop and sticker paths disappear with
no other config.

## Peer dependencies

Install the Milkdown stack **once in the host** (single ProseMirror instance):

```bash
pnpm add @kungal/editor-vue @kungal/editor-core \
  @kungal/ui-vue vue \
  @milkdown/kit @milkdown/prose @milkdown/vue
```

Enable optional plugins by also installing their peers: `katex` (LaTeX),
`codemirror` + `@codemirror/view` + `@codemirror/language-data` (code blocks).

## Status

Scaffold. The `<KunEditor>` prop/emit surface (`v-model`, `adapters`,
`features`, `locale`, `readonly`) is stable; the Milkdown wiring is ported from
the forum's `DualEditorProvider` + `Editor.vue` — see
[`../../docs/architecture.md`](../../docs/architecture.md) § migration. Until
then the component renders a textarea fallback that keeps `v-model` live so you
can integrate against the real contract today.

## Build

```bash
pnpm --filter @kungal/editor-vue build      # vite lib build + vue-tsc d.ts → dist
pnpm --filter @kungal/editor-vue typecheck
```
