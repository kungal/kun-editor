import { KunIcon } from '@kungal/ui-vue'
import { KUN_EDITOR_ICON } from '@kungal/editor-vue'

// Editor chrome names icons by string — an `entityTypes` icon such as
// `lucide:id-card` in the `/` menu and the toolbar's type menu. The headless
// @kungal/editor-vue renders a name through whatever component is provided
// under KUN_EDITOR_ICON; in a KunUI app that is KunIcon, the same component
// (from the same @kungal/ui-vue) every other KunUI icon uses. One provide for
// every <KunEditor> in the app; a single editor can still override it with
// its `icon-component` prop.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.provide(KUN_EDITOR_ICON, KunIcon)
})
