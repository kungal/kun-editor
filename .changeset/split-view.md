---
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

Add a desktop **split view** for long-form writing.

`<KunEditor>` now has a third view mode, `split`, alongside WYSIWYG and Markdown:
an editable markdown source pane + a live **read-only WYSIWYG preview**, side by
side and left/right swappable. The markdown string stays the single source of
truth and the preview is derived — the industry-standard model (VS Code /
StackEdit / Dillinger), so there's no two-editor bidirectional-sync problem.

- **editor-vue**: the view mode gains `'split'`; `KunEditorViewSwitchApi` gains
  `swap()` / `swapped` and `labels.split` / `labels.swap`. The WYSIWYG becomes a
  read-only preview in split (its editability now reacts to the `readonly` prop).
  The default hand-rolled view switch gets a 分栏 tab + a ⇄ swap button.
- **editor-nuxt**: `<KunEditorViewSwitch>` gets the 分栏 KunTab + a KunUI swap
  button (shown in split).
- **Headless**: the layout is class hooks only — `.kun-editor__panes` /
  `.kun-editor__pane` under `[data-mode='split']` (+ `[data-swap]`). Styled by the
  reference `kun-editor.css`: stacked on narrow screens, side-by-side (swappable)
  from `md` up. editor-vue still ships zero CSS.

Verified in the docs production build (headless + KunUI view switches): 分栏 shows
both panes side by side, typing markdown in the source updates the preview live,
the WYSIWYG preview is `contenteditable=false`, swap reverses the panes; 0 console
errors. (Synced scrolling between panes is a possible follow-up.)
