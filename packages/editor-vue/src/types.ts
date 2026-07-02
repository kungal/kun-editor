import type { CmdKey } from '@milkdown/kit/core'
import type {
  KunEditorAdapters,
  KunEditorFeatures,
  KunEditorLocale
} from '@kungal/editor-core'

// The scoped-slot props `<KunEditor #toolbar="api">` hands to a custom toolbar.
// The core stays headless: this is the command API a UI (the default hand-rolled
// toolbar, or a KunUI one, or your own) builds buttons on top of — the same shape
// TipTap/BlockNote expose so the toolbar is a swappable layer, not baked in.
export interface KunEditorToolbarApi {
  /** Run a Milkdown command (import its key from the preset/commonmark/gfm). */
  run: <T>(key: CmdKey<T>, payload?: T) => void
  /** Insert plain text at the cursor (e.g. an emoji). */
  insertText: (text: string) => void
  /** Insert a reference atom at the cursor (requires the quote feature). */
  insertQuote: (payload: { refId: string; label: string }) => void
  /** Insert an @mention atom at the cursor. */
  insertMention: (payload: { userId: number; name: string }) => void
  /** Focus the WYSIWYG editor. */
  focus: () => void
  /** The host policy bundle (uploadImage / stickerSource / notify / …). */
  readonly adapters: KunEditorAdapters
  /** Enabled features — so a toolbar can gate its buttons (e.g. the picker). */
  readonly features: KunEditorFeatures
  /** UI language, for localized labels. */
  readonly locale: KunEditorLocale
}

// The scoped-slot props `<KunEditor #view-switch="api">` hands to a custom view
// switch. Like #toolbar, this keeps the core headless: the Preview/Markdown
// switch is a swappable layer, so a host can render a real <KunTab> (or anything)
// instead of the default hand-rolled tabs — driving the editor via `setMode`.
export interface KunEditorViewSwitchApi {
  /** The active view. */
  mode: 'wysiwyg' | 'source'
  /** Switch the active view. */
  setMode: (mode: 'wysiwyg' | 'source') => void
  /** Localized labels for the two views (respects the `locale` prop). */
  labels: { wysiwyg: string; source: string }
}

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
