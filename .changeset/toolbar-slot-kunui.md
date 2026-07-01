---
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

Add a `#toolbar` slot and a KunUI toolbar — the toolbar is now a swappable layer.

`<KunEditor>` exposes a `#toolbar` scoped slot whose props are the command API
(`KunEditorToolbarApi`: `run(cmdKey, payload)` / `insertText` / `insertQuote` /
`insertMention` / `focus` / `adapters` / `features` / `locale`). The API is
computed inside the Milkdown providers and handed down, so a custom toolbar can
live in the consumer's tree without `useInstance`/`inject`. The hand-rolled
default toolbar is the slot's fallback — omit the slot and nothing changes.

`@kungal/editor-nuxt` ships `<KunEditorToolbar>` (auto-imported): the same
toolbar built with **KunButton / KunIcon / KunTooltip / KunPopover** (real tooltip
delay, popover focus/collision, a11y):

```vue
<KunEditor v-model="md" :adapters="adapters">
  <template #toolbar="api"><KunEditorToolbar v-bind="api" /></template>
</KunEditor>
```

This keeps `@kungal/editor-vue` **headless / zero UI-kit dependency** (any Vue app
can use it with the default toolbar) while the KunUI ecosystem (forum, moyu) gets
native chrome — the "headless core + optional UI layer" pattern (TipTap UI,
BlockNote's swappable toolbar). Also exports `EMOJI` from `@kungal/editor-vue` for
building custom pickers.
