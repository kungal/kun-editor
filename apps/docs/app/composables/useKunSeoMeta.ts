// Per-route SEO (title / description / OG) resolved from site.config, reactive
// so it updates on client-side navigation.
import { computed } from 'vue'
import { useHead, useRoute } from '#imports'
import { getPageMeta, site } from '~/site.config'

export function useKunSeoMeta() {
  const route = useRoute()

  const meta = computed(() => getPageMeta(route.path))
  const pageTitle = computed(() => {
    const m = meta.value
    if (!m || route.path === '/') return `${site.name} — ${site.slogan}`
    const base = m.cn ? `${m.title} (${m.cn})` : m.title
    return `${base} · ${site.name}`
  })
  const description = computed(() => meta.value?.description ?? site.description)

  useHead({
    title: pageTitle,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: pageTitle },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { name: 'keywords', content: site.keywords.join(', ') }
    ]
  })
}
