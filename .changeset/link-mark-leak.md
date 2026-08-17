---
'@kungal/editor-core': patch
---

Stop the link mark from leaking onto text typed after a link is deleted.

A link is a mark, so deleting its text left the link as a ProseMirror STORED
mark — the pending mark re-applied to the next keystroke — which is why typing
right after deleting a link kept producing linked text (the Space keymap only
cleared it while you kept typing). A new `$prose` plugin now clears the stored
link mark the moment the cursor is no longer inside a link, so the next
keystroke starts un-linked text.
