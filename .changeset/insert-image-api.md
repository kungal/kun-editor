---
'@kungal/editor-vue': minor
---

Add an `insertImage({ src })` primitive so hosts can build a rich image dialog.

The editor already had `uploadImage(file)` (adapter-backed, in-document
"uploading…" placeholder). The missing piece for a custom image dialog — insert by
URL, or re-insert from an upload history — was a way to insert an image from a
ready URL. Added:

- `KunEditorToolbarApi.insertImage({ src, alt?, title? })` — for a dialog dropped
  into the `#toolbar` slot.
- `KunEditorExpose.insertImage(...)` and `KunEditorExpose.uploadImage(file)` — the
  same two, on the `<KunEditor>` template ref, to drive image insertion from
  anywhere.

The dialog UI (KunPopover, drag-drop, "recent" history) stays entirely the host's,
matching the headless design and how TipTap/ProseMirror split this
(`setImage(url)` command + host-provided upload UI). Drop the built-in image
button with `:items` and render your own next to `<KunEditorToolbar>`.

Verified in a new docs example (`/examples/image-dialog`): a host dialog inserts
by URL (`api.insertImage`), uploads one or many picked files via the host's own
uploader then inserts each, keeps a "recent" history, and re-inserts on click; the
built-in image button is dropped via `:items`; 0 console errors.
