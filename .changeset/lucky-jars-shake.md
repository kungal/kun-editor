---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

Insert a link from the selection bubble without a native `prompt`

Selecting text → 「链接」 used to pop `window.prompt`. The bubble now asks for the
URL **in place**: the button row swaps for a URL input (`data-mode="link"`),
Enter applies, Esc cancels, and the row comes back. If the selection is already
a link its href is prefilled (and selected), so editing a URL is the same flow.

Why in place, and not a popover/dialog: the bubble is a Milkdown tooltip whose
`shouldShow` keeps it alive only while focus is in the editor **or inside the
bubble element**. Any popover teleports its panel to `<body>` — outside that
element — so the bubble would hide the moment the panel's input took focus. An
input in our own DOM keeps the bubble put, and the ProseMirror selection
survives the DOM blur, so the link wraps exactly what was selected.

Still headless: a plain `<input>` plus one new class hook.

```css
.kun-editor__bubble[data-mode='link'] { /* the URL-entry state */ }
.kun-editor__bubble-input { /* the input itself */ }
```

Hosts that want their own UI keep the escape hatch — the `linkPrompt` adapter
takes precedence over the inline input, exactly as it does over the KunUI
toolbar's popover.

Also in the shipped reference stylesheet (`@kungal/editor-nuxt/editor.css`): the
selection bubble, the @mention dropdown and the sticker/emoji picker painted
themselves with `--color-background` — KunUI's *glassy page* tint (0.7 alpha) —
so document text showed through a panel floating over it. They now use the
RAISED surface token the KunUI popovers use, via one overridable var:

```css
:root { --kun-editor-surface: var(--color-content1, var(--color-background)); }
```
