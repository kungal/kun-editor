import tailwindcss from '@tailwindcss/vite'

// The KunEditor docs site, built WITH KunUI (like kun-ui's own docs). KunUI's
// component auto-imports + theme come from the @kungal/ui-nuxt layer; this app
// owns its Tailwind entry (app/assets/css/main.css), which also pulls in the
// KunEditor reference stylesheet that dresses the headless editor.
export default defineNuxtConfig({
  devtools: { enabled: false },

  // @kungal/ui-nuxt → KunUI chrome; @kungal/editor-nuxt → auto-imports
  // <KunEditor> + the KunUI <KunEditorToolbar> (so the docs dogfoods the same
  // toolbar the forum/moyu use via the #toolbar slot).
  extends: ['@kungal/ui-nuxt', '@kungal/editor-nuxt'],

  // main.css = Tailwind + KunUI theme + the editor reference stylesheet.
  // katex.min.css is the KaTeX render styling — a downstream responsibility when
  // the katex feature is on (the editor ships no CSS).
  css: ['~/assets/css/main.css', 'katex/dist/katex.min.css'],

  // Non-default port so it never collides with other local dev servers.
  devServer: { port: 6899 },

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: 'KunEditor',
      meta: [
        {
          name: 'description',
          content:
            'KunEditor — a Milkdown-based, headless Markdown editor for the KUN Galgame ecosystem.'
        }
      ]
    }
  },

  vite: {
    plugins: [tailwindcss()]
  },

  // Prerender every page (Shiki code baked in at build) by crawling internal
  // links from "/". It stays a Nitro node server (the Docker image runs it), so
  // any page the crawler misses still renders on demand. Live editors are
  // <ClientOnly>, so nothing Milkdown runs during prerender.
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/']
    }
  },

  compatibilityDate: '2025-01-01'
})
