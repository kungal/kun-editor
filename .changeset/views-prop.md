---
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

`<KunEditor>` gains a `views` prop to control which view modes the switch offers.

The split view is great on a full editor but heavy in a small reply/comment box —
and there was no way to opt out per-editor (all or nothing). Now pass `views`:

```vue
<!-- edit page: all three (default) -->
<KunEditor v-model="md" />
<!-- reply / comment: no split -->
<KunEditor v-model="md" :views="['wysiwyg', 'source']" />
<!-- just WYSIWYG: the switch bar is hidden entirely -->
<KunEditor v-model="md" :views="['wysiwyg']" />
```

- Default `['wysiwyg', 'source', 'split']`. The view switch renders only the
  offered modes, and disappears when a single mode is offered. If `views` changes
  to exclude the active mode, it falls back to the first offered.
- `KunEditorViewSwitchApi` gains `views`; the default view switch and
  `<KunEditorViewSwitch>` (editor-nuxt) both render from it.

Verified in the docs production build: an editor with `:views="['wysiwyg','source']"`
shows only 预览/Markdown (no 分栏), while default editors still show all three; 0
console errors.
