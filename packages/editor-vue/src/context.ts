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
import type { KunSelectionItem } from './types'

export interface KunEditorContext {
  /** The host policy bundle (searchMentionUsers, stickerSource, notify, …). */
  readonly adapters: KunEditorAdapters
  /** Which optional plugins/views are enabled. */
  readonly features: KunEditorFeatures
  /** UI language, for view chrome (dropdown hints, picker tabs, etc.). */
  readonly locale: KunEditorLocale
  /** Ordered buttons for the selection bubble toolbar (a plugin view reads it). */
  readonly selectionToolbarItems: KunSelectionItem[]
}

export const KUN_EDITOR_CONTEXT: InjectionKey<KunEditorContext> =
  Symbol('kun-editor-context')
