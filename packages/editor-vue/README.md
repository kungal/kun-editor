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

**P3 complete.** `<KunEditor>` is a **real Milkdown dual-view editor**: a WYSIWYG
view built from `@kungal/editor-core/preset` (`createKunEditorPlugins` — spoiler /
katex / code-block / mention / upload / …) and a CodeMirror markdown-source view,
over one `v-model`. The prop/emit surface (`v-model`, `adapters`, `features`,
`locale`, `readonly`) is stable.

A **formatting toolbar** is wired: bold / italic / strikethrough / inline code,
H1–H3, bullet & ordered lists, blockquote, code block, divider, spoiler, LaTeX —
plus an image-upload button when `uploadImage` is supplied. It's self-contained
(inline SVG, no `@kungal/ui-vue` dependency), themed through CSS variables so a
KunUI host still gets matching colours.

The **`@mention` autocomplete dropdown** is wired: type `@`, and — when the host
supplies `searchMentionUsers` — a debounced, keyboard-navigable dropdown offers
users and inserts a mention chip (`[@name](kungal-user:id)`). Without the adapter
the mention schema still round-trips; there's just no autocomplete.

The **sticker / emoji picker** is a toolbar popover: a built-in emoji tab
(unicode, inserted as text — no adapter) plus a sticker tab that appears when the
host supplies `stickerSource`, inserting each sticker as an image node. Turn the
whole picker off with `features.sticker: false`.

The **markdown-source view** (the "Markdown" tab) is a CodeMirror editor with
markdown highlighting, sharing the code block's `kunCM` theme. Edits sync back
through `v-model` to the WYSIWYG view.

Next: **P4** — adopt in the forum, replacing its in-repo `components/kun/milkdown`
with real adapters. See
[`../../docs/architecture.md`](../../docs/architecture.md) § migration.

## Build

```bash
pnpm --filter @kungal/editor-vue build      # vite lib build + vue-tsc d.ts → dist
pnpm --filter @kungal/editor-vue typecheck
```
