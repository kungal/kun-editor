---
'@kungal/editor-vue': patch
---

Fix the cursor jumping to the start when editing the source pane in split mode.

Typing a character on an empty line (or deleting the first character of a line)
in the split-view source editor jumped the caret back to the document start. Cause:
a feedback loop — the source (CodeMirror) edit updated the shared `v-model`, the
read-only WYSIWYG preview re-rendered and echoed its *re-serialized* (normalized)
markdown back into `v-model`, and CodeMirror then rebuilt its whole state
(`setState`) to match, resetting the selection.

Two fixes:
- **MilkdownEditor** no longer echoes changes it applied from an external
  `v-model` update (it only emits genuine user edits), so the preview stops
  feeding normalized markdown back.
- **MarkdownSource** now re-syncs external changes with a content-replacing
  transaction that preserves (clamps) the selection, instead of a full `setState`
  rebuild — so the caret and undo history survive.

Verified in the docs production build (split mode): typing `x y z` on an empty
line yields `xyz` in order; deleting the first char of a line keeps the caret on
that line; 0 console errors.
