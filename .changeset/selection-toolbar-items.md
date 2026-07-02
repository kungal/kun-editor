---
'@kungal/editor-vue': minor
---

The selection bubble toolbar's buttons are now configurable.

`<KunEditor>`'s `selectionToolbar` prop now accepts `boolean | KunSelectionItem[]`:

```vue
<KunEditor v-model="md" />                                  <!-- default 4 buttons -->
<KunEditor v-model="md" :selection-toolbar="['bold','italic']" /> <!-- reorder / subset -->
<KunEditor v-model="md" :selection-toolbar="false" />       <!-- off -->
```

`KunSelectionItem` is `'bold' | 'italic' | 'strike' | 'code' | '|'` (`'|'` a
divider), exported from `@kungal/editor-vue`. The resolved items reach the bubble
(a plugin view) through the editor context; dividers collapse around removed
items. The bubble's **look** is (and was) styled via the `.kun-editor__bubble` /
`.kun-editor__bubble-btn` class hooks — headless, no new API.

Verified in the docs production build: an editor with
`:selection-toolbar="['bold','italic']"` shows a 2-button bubble while the default
shows 4; 0 console errors.
