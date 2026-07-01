// The imperative handle a host gets from a `<KunEditor>` template ref:
//
//   const editor = ref<InstanceType<typeof KunEditor>>()
//   editor.value?.insertQuote({ refId: '123', label: '#5' })
//
// This is how the forum inserts a reply reference at the caret when a floor's
// 「引用」 is clicked — a live, cursor-level insert (not a markdown-string edit).
export interface KunEditorExpose {
  /**
   * Insert a reference atom at the cursor (`[label](kungal-reply:refId)`), then
   * focus. Requires the `quote` feature to be enabled.
   */
  insertQuote(payload: { refId: string; label: string }): void
  /**
   * Insert an @mention atom at the cursor (`[@name](kungal-user:id)`), then
   * focus. Requires the `mention` feature (on by default).
   */
  insertMention(payload: { userId: number; name: string }): void
  /** Focus the WYSIWYG editor. */
  focus(): void
}
