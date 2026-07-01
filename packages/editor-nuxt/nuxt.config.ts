import { defineNuxtModule, addComponent, createResolver } from '@nuxt/kit'

// KunEditor Nuxt layer. <KunEditor> itself lives in the framework-agnostic,
// headless @kungal/editor-vue; this layer registers it as a Nuxt auto-import so
// downstream templates use `<KunEditor>` with no import (and Nuxt generates its
// types, keeping the tag type-checked in consumer templates).
//
// It also ships <KunEditorToolbar>: the KunUI-built toolbar for <KunEditor>'s
// #toolbar slot. It belongs HERE (this layer already assumes @kungal/ui-nuxt),
// not in headless @kungal/editor-vue — so editor-vue stays UI-kit-free while the
// KunUI ecosystem gets native chrome. Same shape as TipTap's optional UI pkg.
export default defineNuxtConfig({
  modules: [
    defineNuxtModule({
      meta: { name: 'kun-editor-components' },
      setup() {
        const { resolve } = createResolver(import.meta.url)
        addComponent({
          name: 'KunEditor',
          export: 'KunEditor',
          filePath: '@kungal/editor-vue'
        })
        addComponent({
          name: 'KunEditorToolbar',
          filePath: resolve('./runtime/KunEditorToolbar.vue')
        })
      }
    })
  ]
})

// NOTE: this layer does NOT own a Tailwind entry or import editor styles. The
// consuming app owns one stylesheet and adds `@kungal/editor-vue/style.css`
// alongside its @kungal/ui-tokens + @kungal/ui-vue setup — the @source scan
// path is node_modules-layout-specific, so only the app can write it. It also
// assumes @kungal/ui-nuxt is already extended: <KunEditorToolbar> (and the
// reference editor styles) render KunUI chrome. See this package's README.
