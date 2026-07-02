---
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

Add a `#view-switch` slot and a KunUI view switch — the Preview/Markdown tabs are
now a swappable layer too.

`<KunEditor>` exposes a `#view-switch` scoped slot whose props are
`KunEditorViewSwitchApi` (`mode` / `setMode` / `labels`). The hand-rolled tabs
are the slot's fallback — omit the slot and nothing changes. This lets a host
render a real component (or anything) for the view switch and drive the editor
via `setMode`, without reaching into internals.

`@kungal/editor-nuxt` ships `<KunEditorViewSwitch>` (auto-imported): the tabs as a
real `<KunTab variant="underlined">` (keyboard nav, sliding indicator, a11y):

```vue
<KunEditor v-model="md">
  <template #view-switch="s"><KunEditorViewSwitch v-bind="s" /></template>
  <template #toolbar="api"><KunEditorToolbar v-bind="api" /></template>
</KunEditor>
```

Same "headless core + optional KunUI layer" pattern as `#toolbar` /
`<KunEditorToolbar>`: `@kungal/editor-vue` stays UI-kit-free (default tabs), the
KunUI ecosystem gets native chrome. Exports `KunEditorViewSwitchApi`.
