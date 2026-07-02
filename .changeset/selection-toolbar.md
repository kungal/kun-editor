---
'@kungal/editor-vue': minor
---

Add a selection bubble toolbar (floating format menu on text selection).

Selecting text now shows a floating inline-format menu (bold / italic /
strikethrough / inline code) over the selection — the Medium/Notion pattern. It's
built the Milkdown v7 way: a tooltip plugin view (`@milkdown/kit/plugin/tooltip`'s
`tooltipFactory` + `TooltipProvider`, rendered via `@prosemirror-adapter/vue` —
the same plugin-view mechanism as the @mention dropdown). `TooltipProvider`
handles show/hide/positioning (floating-ui): shown only on a non-empty text
selection while focused, and never when read-only (so it's inert in the split
preview). Buttons run the same toggle commands as the fixed toolbar.

- `<KunEditor>` gains a `selectionToolbar` prop (default `true`; set `false` to
  disable).
- Headless: the bubble is class hooks only (`.kun-editor__bubble` /
  `.kun-editor__bubble-btn`, with `[data-show]`), like the @mention dropdown —
  styled by the reference `kun-editor.css`. editor-vue still ships zero CSS.

Verified in the docs production build: selecting text shows the positioned bubble;
clicking bold marks the selection (`**…**`); collapsing the selection hides it; 0
console errors.
