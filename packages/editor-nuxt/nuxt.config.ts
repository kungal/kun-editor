import { defineNuxtModule, addComponent } from '@nuxt/kit'

// KunEditor Nuxt layer. The component lives (already compiled) in the
// framework-agnostic-friendly @kungal/editor-vue package; this layer just
// registers it as a Nuxt auto-import so downstream templates can use
// `<KunEditor>` with no import — and Nuxt generates its types, so the tag stays
// type-checked in consumer templates.
export default defineNuxtConfig({
  modules: [
    defineNuxtModule({
      meta: { name: 'kun-editor-components' },
      setup() {
        addComponent({
          name: 'KunEditor',
          export: 'KunEditor',
          filePath: '@kungal/editor-vue'
        })
      }
    })
  ]
})

// NOTE: this layer does NOT own a Tailwind entry or import editor styles. The
// consuming app owns one stylesheet and adds `@kungal/editor-vue/style.css`
// alongside its @kungal/ui-tokens + @kungal/ui-vue setup — the @source scan
// path is node_modules-layout-specific, so only the app can write it. It also
// assumes @kungal/ui-nuxt is already extended (KunEditor renders KunUI chrome).
// See this package's README.
