---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

Toolbar image upload now shows an in-document "uploading…" placeholder.

Previously only paste/drop showed the in-flight placeholder (Milkdown's `upload`
plugin); the toolbar image button uploaded silently — the image just popped in
when the adapter resolved. Now the toolbar path uses the same placeholder UX
(ProseMirror's official upload-example pattern).

- **editor-core**: `startImageUpload(view, file, { uploadImage, notify, locale })`
  + the `imageUploadPlaceholder` decoration plugin (exported from `/preset`;
  wired by the preset when `uploadImage` is present). Inserts a
  `.kun-editor__uploading` widget at the caret, uploads, then replaces it with the
  image (or removes it + notifies on failure); not an undo step. The paste/drop
  placeholder now uses the same `.kun-editor__uploading` class so both look
  identical.
- **editor-vue**: `KunEditorToolbarApi` gains `uploadImage(file)`; both the
  headless `EditorToolbar` and the `#toolbar` slot API route uploads through
  `startImageUpload`.
- **editor-nuxt**: `<KunEditorToolbar>`'s image button uses it.
- **Headless kept**: the placeholder is a class + widget hook only; style it via
  `.kun-editor__uploading` in the reference `kun-editor.css` (primary-colored).

Customizable: style the placeholder via `.kun-editor__uploading`; the text is
localized (zh/en). Verified in the docs production build: uploading via either
toolbar inserts the image; the unit tests confirm the placeholder shows during a
pending upload and is replaced on success / removed on failure.
