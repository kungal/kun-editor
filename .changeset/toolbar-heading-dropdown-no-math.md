---
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

Toolbar: headings become one "text size" dropdown; remove the formula button.

- **Headings → a single "text size" control** (Paragraph / H1–H6) instead of
  three H1/H2/H3 buttons — the modern standard, and it can set Paragraph (reset),
  which the old toggle buttons couldn't. The headless `EditorToolbar` uses a
  native `<select>` (new `.kun-editor__heading-select` class hook); the KunUI
  `<KunEditorToolbar>` uses a `<KunPopover>` with each level shown at its own size
  (like the forum). Both drive `setHeadingCommand`.
- **Remove the math/formula button.** With no selection it inserted an empty
  inline-math node (a broken formula box). Math is entered via the existing
  `$…$` / `$$` input rules instead — the ecosystem norm (prosemirror-math). The
  spoiler button stays.
