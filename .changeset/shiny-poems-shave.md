---
'@kungal/editor-core': patch
'@kungal/editor-nuxt': patch
'@kungal/editor-vue': patch
---

Fix a long `placeholder` overflowing the editor, and ship the reference
stylesheet from the layer.

The placeholder is a decoration (`.kun-editor__placeholder` +
`data-placeholder`) rendered by the host's `::before` rule. That rule was
absolutely positioned with **no positioned ancestor**, so the browser laid it
out against the viewport: a long placeholder ran past the editor's right edge —
and could even paint over the toolbar — instead of wrapping inside it. The
empty block is now the containing block, and the text wraps (`width: 100%` +
`overflow-wrap: break-word`):

```css
.kun-editor__placeholder {
  position: relative;
}
.kun-editor__placeholder::before {
  content: attr(data-placeholder);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  overflow-wrap: break-word;
}
```

Because that CSS lived only in the docs app, every host had a *copy* — an
upstream style fix could never reach them. The reference stylesheet now ships
with `@kungal/editor-nuxt`, so hosts can import it and get fixes with a version
bump (copying it still works):

```css
@import '@kungal/editor-nuxt/editor.css';
```

`@kungal/editor-vue` is unchanged and still headless (zero CSS).
