// @kungal/editor-vue — public entry.
//
// Re-exports the core adapter contracts so a Vue host imports everything it
// needs from one package, and exports the components + a Vue plugin installer
// mirroring @kungal/ui-vue's `KunUI` shape.
import type { App, Plugin } from 'vue'
import KunEditor from './components/KunEditor.vue'
import KunEntityPicker from './components/EntityPicker.vue'

export { KunEditor }

// The entity picker panel (type tabs + search + results) — for a custom or
// KunUI toolbar's entity button. Props `{ adapters, locale }`; emits `pick`
// (an EntityHit — insert it with the toolbar API's `insertEntity(hit.ref)`)
// and `close`.
export { KunEntityPicker }

// The props a host's entity card / chip component receives, and the
// `entityView` prop shape.
export type {
  KunEntityView,
  KunEntityViewProps,
  KunEntityInsertDisplay
} from './types'

// The imperative handle from a <KunEditor> template ref (insertQuote / …).
export type { KunEditorExpose } from './types'

// The command API the #toolbar scoped slot exposes (build a custom toolbar).
export type { KunEditorToolbarApi } from './types'

// A toolbar button id for <KunEditorToolbar :items> (reorder / subset buttons).
export type { KunToolbarItem } from './types'

// A button id for the selection bubble (<KunEditor :selection-toolbar>).
export type { KunSelectionItem } from './types'

// The toggle marks a toolbar can show an active state for (bold / italic / …).
export type { KunToggleMark } from './types'

// The API the #view-switch scoped slot exposes (build a custom view switch).
export type { KunEditorViewSwitchApi } from './types'

// The built-in emoji set — handy when building a custom toolbar's emoji picker.
export { EMOJI } from './emoji'

// The heading outline item type emitted by `@update:headings` (for a TOC).
export type { KunHeading } from '@kungal/editor-core'
// `parseHeadings(markdown)` — build the same outline yourself if needed.
export { parseHeadings } from '@kungal/editor-core'

// Re-export the core types so hosts don't need a second import line.
export type {
  KunEditorAdapters,
  KunEditorFeatures,
  KunEditorLocale,
  UploadImage,
  SearchMentionUsers,
  StickerSource,
  Notify,
  NotifyLevel,
  MentionUser,
  StickerItem,
  StickerPack,
  EntityRef,
  EntityHit,
  EntityTypeItem,
  EntityDisplay,
  EntityFromUrl,
  SearchEntities,
  EntityTitle
} from '@kungal/editor-core'

/** Vue plugin: `app.use(KunEditorPlugin)` to register <KunEditor> globally. */
export const KunEditorPlugin: Plugin = {
  install(app: App) {
    app.component('KunEditor', KunEditor)
  }
}
