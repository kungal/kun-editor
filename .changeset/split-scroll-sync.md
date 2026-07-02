---
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

Split view: sync scrolling between the panes, with an off switch.

Scrolling the markdown source pane now scrolls the WYSIWYG preview to the same
position (and vice-versa) — proportional/percentage sync (source↔preview line
mapping is impractical across two separate renderers), with an active-pane +
idle-timeout guard so the echoed scroll doesn't feed back into a loop.

Turn it off two ways (for downstream customization):
- **`scrollSync` prop** on `<KunEditor>` (default `true`) — pass
  `:scroll-sync="false"` to disable entirely.
- **A runtime toggle** in the view switch: `KunEditorViewSwitchApi` gains
  `scrollSync` / `toggleScrollSync()` (+ `labels.scrollSync`). The default view
  switch shows a 同步滚动 toggle in split mode; `<KunEditorViewSwitch>` (editor-nuxt)
  shows a KunUI link/unlink toggle button. Or replace the whole control via the
  `#view-switch` slot.

Sync needs each pane to scroll internally, so the reference `kun-editor.css` now
gives split panes a bounded height (`--kun-editor-split-height`, default `60vh`,
overridable) with `overflow: auto`. editor-vue still ships zero CSS.

Verified in the docs production build (headless + KunUI view switches): with the
panes overflowing, scrolling the source drives the preview to the same ratio;
toggling off makes them scroll independently; toggling on resumes; 0 console
errors.
