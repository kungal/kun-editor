---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

fix(editor): the spoiler toolbar button hides the selection instead of deleting it

`insertKunSpoilerCommand` built an EMPTY `kun-spoiler` node and dropped it over
the selection with `replaceSelectionWith`, so clicking 隐藏文本 with text selected
deleted the text and left a bare `||||` — and the next thing typed landed
outside the node, so nothing was hidden either. The JSDoc said "wraps the
current selection"; the code never wrapped anything.

The command now covers the three cases the `||…||` syntax does:

- **a selection** → its text moves inside the node. The schema is `marks: ''`
  (inline formatting cannot round-trip through `||…||`), so bold is what's
  dropped, never the words. Selections spanning paragraphs collapse into one
  spoiler; select-all (an `AllSelection`) works too.
- **an empty selection** → a new spoiler with the caret INSIDE it: type and it
  is hidden. It holds a zero-width caret anchor, because a caret cannot sit in
  an inline node with no text node in it — the serializer strips anchors, and a
  spoiler holding nothing else serializes to nothing, so a stray click cannot
  leave `||||` behind.
- **the caret already inside a spoiler** → reveal it, leaving the text selected.
  Nesting would have produced `||||text||||`, which reads back as nothing.

The button is therefore a toggle, and both toolbars (the headless one and the
KunUI one in `@kungal/editor-nuxt`) now show it pressed while the caret is
inside a spoiler — `KunToggleMark` gains a `'spoiler'` member for that, so
`activeMarks` carries one more key.

It returns `false` — no document change — inside a code block and with a node
selected (an image is not text; replacing it would delete it).
