// Injection context for KunEditor's plugin VIEWS (the @mention dropdown, and
// later the sticker picker / tooltip).
//
// Why an injection: @prosemirror-adapter/vue renders plugin views as portals
// that are children of <ProsemirrorAdapterProvider> — i.e. SIBLINGS of
// <MilkdownEditor>, not its descendants. So a `provide()` on MilkdownEditor
// would NOT reach them; the provide must come from <KunEditor> (an ANCESTOR of
// the provider). This module is that shared key + shape.
import type { InjectionKey } from 'vue'
import type { KunEditorAdapters, KunEditorLocale } from '@kungal/editor-core'

export interface KunEditorContext {
  /** The host policy bundle (searchMentionUsers, stickerSource, notify, …). */
  readonly adapters: KunEditorAdapters
  /** UI language, for view chrome (dropdown hints, etc.). */
  readonly locale: KunEditorLocale
}

export const KUN_EDITOR_CONTEXT: InjectionKey<KunEditorContext> =
  Symbol('kun-editor-context')
