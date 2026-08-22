// Injection context for KunEditor's plugin VIEWS (the @mention dropdown, the
// sticker/emoji picker, …).
//
// Why an injection: @prosemirror-adapter/vue renders plugin views as portals
// that are children of <ProsemirrorAdapterProvider> — i.e. SIBLINGS of
// <MilkdownEditor>, not its descendants. So a `provide()` on MilkdownEditor
// would NOT reach them; the provide must come from <KunEditor> (an ANCESTOR of
// the provider). This module is that shared key + shape.
import type { InjectionKey } from 'vue'
import type {
  KunEditorAdapters,
  KunEditorFeatures,
  KunEditorLocale
} from '@kungal/editor-core'
import type { KunSelectionItem, KunToggleMark } from './types'

export interface KunEditorContext {
  /** The host policy bundle (searchMentionUsers, stickerSource, notify, …). */
  readonly adapters: KunEditorAdapters
  /** Which optional plugins/views are enabled. */
  readonly features: KunEditorFeatures
  /** UI language, for view chrome (dropdown hints, picker tabs, etc.). */
  readonly locale: KunEditorLocale
  /** Ordered buttons for the selection bubble toolbar (a plugin view reads it). */
  readonly selectionToolbarItems: KunSelectionItem[]
  /**
   * Live toggle-mark state (bold / italic / strike / code). Mutated in place
   * by the editor's active-marks plugin on every view update — toolbar and
   * bubble both read this same object.
   */
  readonly activeMarks: Record<KunToggleMark, boolean>
}

export const KUN_EDITOR_CONTEXT: InjectionKey<KunEditorContext> =
  Symbol('kun-editor-context')

/**
 * The bubble's default button row — ONE copy, read by <KunEditor> (which puts it
 * on the context) and by the bubble itself (for the no-context case). Two copies
 * drift: adding a button to the bubble's own fallback did nothing at all,
 * because every real editor gets the list from the context.
 *
 * `spoiler` is in it: hiding a selection is the KUN-specific inline action, and
 * the bubble only ever shows on a text selection — exactly the case the command
 * wraps (and, with the caret inside a spoiler, reveals).
 */
export const DEFAULT_SELECTION_ITEMS: KunSelectionItem[] = [
  'bold',
  'italic',
  'strike',
  'code',
  'spoiler',
  'link'
]
