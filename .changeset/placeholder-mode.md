---
'@kungal/editor-vue': minor
---

Placeholder: default to `'doc'` mode + expose `placeholderMode`.

The placeholder used to appear on **every empty line** (the cursor's empty
block) — that's the Milkdown/Notion `'block'` behavior, which was the default but
is surprising for a reply/comment editor. `<KunEditor>` now defaults to `'doc'`:
the placeholder shows **only while the whole editor is empty** (the conventional
empty-state hint), and the new `placeholderMode` prop opts back into per-line
`'block'`:

```vue
<KunEditor v-model="md" placeholder="写点什么…" />                       <!-- only when empty -->
<KunEditor v-model="md" placeholder="写点什么…" placeholder-mode="block" /> <!-- on each empty line -->
```

(The lower-level `createKunEditorPlugins(..., { placeholderMode })` /
`createPlaceholderPlugin` still default to `'block'` for parity with Crepe; the
opinion lives in the `<KunEditor>` component.)

Verified in the docs production build: empty editor shows the placeholder; typing
a line then Enter (an empty line in a non-empty doc) does not; `placeholder-mode="block"`
brings back the per-line hint. 47 core tests pass (incl. new doc-vs-block cases).
