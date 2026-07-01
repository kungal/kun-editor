<script setup lang="ts">
// Syntax highlighting via Shiki, run inside useAsyncData so during `nuxt
// generate` the HTML is computed server-side and baked into the payload; Shiki
// is dynamically imported so it never lands in the main client bundle. Dual
// theme: light inline, dark via CSS vars switched on by `.kun-dark-mode`.
const props = withDefaults(defineProps<{ code: string; lang?: string }>(), {
  lang: 'vue'
})

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

const { data: html } = await useAsyncData(
  `shiki:${props.lang}:${hash(props.code)}`,
  async () => {
    const { codeToHtml } = await import('shiki')
    return codeToHtml(props.code, {
      lang: props.lang,
      themes: { light: 'github-light', dark: 'github-dark' }
    })
  }
)
</script>

<template>
  <div class="group relative">
    <div
      class="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <KunCopy :text="code" name="复制代码" variant="solid" color="default" />
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div
      class="kun-code border-default-200 rounded-kun-md overflow-hidden border text-sm"
      v-html="html"
    />
  </div>
</template>

<style scoped>
.kun-code :deep(pre) {
  margin: 0;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  line-height: 1.6;
}
</style>

<style>
.kun-code .shiki {
  background-color: oklch(var(--content1) / 0.6) !important;
}
.kun-dark-mode .kun-code .shiki,
.kun-dark-mode .kun-code .shiki span {
  color: var(--shiki-dark) !important;
}
</style>
