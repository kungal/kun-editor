---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

No native `prompt` left: the headless toolbar gets a link URL panel too

0.33.0 gave the selection bubble an inline URL input; the fixed (headless)
toolbar still popped `window.prompt`. It now opens a small panel under the link
button — Enter applies, Esc cancels, clicking outside closes, and the editor
gets focus back. Same behaviour as the bubble otherwise: an existing href is
prefilled (and selected), and with nothing selected the URL is inserted as
linked text. A panel rather than an in-place swap because a fixed toolbar row
that rearranges itself is jarring; the bubble is already a floating layer, so
there the swap is the right shape.

**Breaking (CSS hook, one version old):** `.kun-editor__bubble-input` →
`.kun-editor__link-input`. Both entry points render the same input, so the hook
is named after the thing, not the place. Hosts importing
`@kungal/editor-nuxt/editor.css` need no change; a copied stylesheet wants the
rename plus the two new hooks:

```css
.kun-editor__link { position: relative; }        /* structural */
.kun-editor__link-panel { position: absolute; }  /* structural */
.kun-editor__link-input { /* shared by the toolbar panel and the bubble */ }
```

`linkPrompt` keeps taking precedence over all three built-in entries (bubble
input, toolbar panel, KunUI popover), so a host modal is still one override.
