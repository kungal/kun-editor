# @kungal/editor-nuxt

The **Nuxt Layer** for KunEditor. It wraps [`@kungal/editor-vue`](../editor-vue)
and auto-imports `<KunEditor>`, so an existing Nuxt app uses the editor with no
`import` line — the same DX the forum has today with its in-repo Milkdown
component.

## Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@kungal/ui-nuxt', '@kungal/editor-nuxt']
})
```

Then, anywhere in a template:

```vue
<KunEditor v-model="markdown" :adapters="adapters" />
```

## Requirements

- Extend `@kungal/ui-nuxt` too — `<KunEditor>` renders KunUI chrome
  (`KunButton`, `KunIcon`, `KunPopover`, …).
- Install the Milkdown peers in the app (single ProseMirror instance):
  `@milkdown/kit @milkdown/prose @milkdown/vue`.
- Add `@kungal/editor-vue/style.css` to your app's stylesheet next to the
  `@kungal/ui-tokens` + `@kungal/ui-vue` setup. This layer intentionally owns no
  Tailwind entry — the `@source` scan path is node_modules-layout-specific, so
  only the app can write it correctly.

## Status

Scaffold — see [`../../docs/architecture.md`](../../docs/architecture.md).
