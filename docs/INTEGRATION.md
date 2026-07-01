# Integrating KunEditor

> While KunEditor is at P0 scaffold, `<KunEditor>` renders a textarea fallback
> that keeps `v-model` live. Everything below is the **stable contract** — code
> against it now; behavior fills in as the Milkdown ports land (see
> [`architecture.md`](./architecture.md)).

## 1. Install

Install KunEditor plus the Milkdown stack **in the host** (single ProseMirror
instance — see architecture.md § singleton) and `@kungal/ui-vue` for the chrome:

```bash
# Plain Vue
pnpm add @kungal/editor-vue @kungal/editor-core \
  @kungal/ui-vue vue \
  @milkdown/kit @milkdown/prose @milkdown/vue

# Optional plugin peers
pnpm add katex                                   # LaTeX
pnpm add codemirror @codemirror/view @codemirror/language-data   # code blocks
```

Nuxt: also add `@kungal/editor-nuxt`, `@kungal/ui-nuxt`, `nuxt`.

## 2. Styles

KunEditor is **headless** — it ships zero CSS, only stable class hooks
(`.kun-editor__*`, `.kun-mention-dropdown*`) and `data-*` state. Give it a look
with your own stylesheet. The canonical reference is
[`apps/docs/app/assets/css/kun-editor.css`](../apps/docs/app/assets/css/kun-editor.css),
which themes the hooks with KunUI tokens — copy it next to your KunUI entry:

```css
/* your app's main.css — after @kungal/ui-tokens + @kungal/ui-vue */
@import './kun-editor.css'; /* the reference stylesheet, copied into your app */
```

Also import the peers' own CSS for the features you enable:

```ts
import 'katex/dist/katex.min.css' // when the katex feature is on
```

The reference stylesheet carries the two structural rules the editor genuinely
needs (ProseMirror `white-space`, popover positioning / show-hide), so don't drop
those if you write your own.

## 3. Wire adapters (the important part)

Adapters are how the editor talks to *your* backend. All optional — omit one and
its plugin disappears.

```ts
import type { KunEditorAdapters } from '@kungal/editor-core'

const adapters: KunEditorAdapters = {
  // Upload one image, return the URL to embed. Called per image for toolbar
  // pick / paste / drop. Reject to abort that image.
  uploadImage: async (file) => {
    const form = new FormData()
    form.append('image', file)
    return await api.post<string>('/image/topic', form)
  },

  // Resolve @mention queries. Debouncing is handled inside the editor.
  searchMentionUsers: (q) => oauth.searchUsers(q), // → { id, name, avatar? }[]

  // Optional: sticker packs for the picker. Omit to hide the sticker UI.
  stickerSource: () => stickerStore.packs,

  // Optional: route editor notices to your toast system.
  notify: (message, level) => toast[level](message)
}
```

### Vue

```vue
<script setup lang="ts">
import { KunEditor } from '@kungal/editor-vue'
import '~/assets/kun-editor.css' // your copy of the reference stylesheet
const markdown = ref('')
</script>

<template>
  <KunEditor v-model="markdown" :adapters="adapters" locale="zh-cn" />
</template>
```

### Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@kungal/ui-nuxt', '@kungal/editor-nuxt']
})
```

```vue
<!-- no import needed -->
<KunEditor v-model="markdown" :adapters="adapters" />
```

## 4. Feature toggles

`features` turns optional plugins off even when their adapter is present — but an
absent adapter always wins (you can't enable `mention` without
`searchMentionUsers`).

```vue
<KunEditor
  v-model="markdown"
  :adapters="adapters"
  :features="{ katex: false, sticker: false }"
/>
```

The **image-free** editor (e.g. a short intro field) is just an omitted
`uploadImage` — no flag needed; upload, paste/drop and sticker paths all drop
out together.

## 5. Props reference

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `v-model` | `string` | — | bound markdown |
| `adapters` | `KunEditorAdapters` | `{}` | policy: upload / mention / sticker / notify |
| `features` | `KunEditorFeatures` | `{}` | per-plugin on/off (absent adapter wins) |
| `locale` | `'zh-cn' \| 'en-us' \| string` | `'zh-cn'` | toolbar labels / placeholders |
| `readonly` | `boolean` | `false` | render without the toolbar / editing |

## Security note

Like KunUI, **KunEditor does not sanitize HTML**. It produces and consumes
markdown; rendering that markdown to HTML (and sanitizing it) is the host's job,
server-side, exactly as the forum does today. The `kungal-user:` mention scheme
is intentionally a non-navigating link the server resolves.
