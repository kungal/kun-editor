---
'@kungal/editor-core': minor
---

Add `setHeadingCommand` — absolute block-type set (paragraph or heading level).

commonmark ships `wrapInHeadingCommand` (a toggle) but no "set paragraph"
command, so a "text size" dropdown (Paragraph / H1–H6, each option setting one
exact level) couldn't be built from it. `setHeadingCommand` uses ProseMirror's
`setBlockType`: `level` 0 → paragraph, 1–6 → heading. Exported from
`@kungal/editor-core/preset`; drive it with `run(setHeadingCommand.key, level)`.
