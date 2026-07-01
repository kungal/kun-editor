<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { useRoute } from '#imports'

// Per-route SEO from site.config.
useKunSeoMeta()

const route = useRoute()
// Home is a full-width landing (no sidebar); every other page keeps the sidebar.
const isHome = computed(() => route.path === '/')

// KunUI dark mode keys off `.kun-dark-mode` on <html>.
const dark = ref(false)
watchEffect(() => {
  if (import.meta.client) {
    document.documentElement.classList.toggle('kun-dark-mode', dark.value)
  }
})

// Mobile nav drawer — close on route change.
const mobileNavOpen = ref(false)
watch(
  () => route.path,
  () => {
    mobileNavOpen.value = false
  }
)
</script>

<template>
  <div class="bg-background text-foreground min-h-screen">
    <header
      class="border-default-200 bg-background/80 sticky top-0 z-40 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur sm:px-5"
    >
      <div class="flex items-center gap-1.5">
        <button
          v-if="!isHome"
          type="button"
          aria-label="打开导航菜单"
          class="text-default-600 hover:text-foreground -ml-1 inline-flex cursor-pointer items-center justify-center p-1 md:hidden"
          @click="mobileNavOpen = true"
        >
          <KunIcon name="lucide:menu" class="text-xl" />
        </button>
        <NuxtLink to="/" class="flex items-center gap-2 font-bold">
          <KunIcon name="lucide:pen-line" class="text-primary text-xl" />
          <span>Kun<span class="text-primary">Editor</span></span>
        </NuxtLink>
      </div>

      <div class="flex items-center gap-3 sm:gap-4">
        <SearchBox />
        <NuxtLink
          to="/playground"
          class="text-default-600 hover:text-foreground hidden items-center gap-1.5 text-sm transition-colors sm:flex"
          active-class="!text-primary"
        >
          <KunIcon name="lucide:flask-conical" /> Playground
        </NuxtLink>
        <a
          href="https://github.com/kungal/kun-editor"
          target="_blank"
          rel="noopener"
          class="text-default-600 hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
        >
          <KunIcon name="lucide:github" />
          <span class="hidden sm:inline">GitHub</span>
        </a>
        <button
          type="button"
          aria-label="切换深色模式"
          class="text-default-600 hover:text-foreground shrink-0 cursor-pointer text-lg transition-colors"
          @click="dark = !dark"
        >
          <KunIcon :name="dark ? 'lucide:sun' : 'lucide:moon'" />
        </button>
      </div>
    </header>

    <div :class="isHome ? '' : 'mx-auto flex max-w-7xl'">
      <aside
        v-if="!isHome"
        class="border-default-200 sticky top-[57px] hidden h-[calc(100vh-57px)] w-60 shrink-0 overflow-y-auto border-r p-4 md:block"
      >
        <DocsNav />
      </aside>

      <main :class="isHome ? 'min-w-0' : 'min-w-0 flex-1 px-6 py-10 lg:px-10'">
        <NuxtPage />
      </main>
    </div>

    <Teleport to="body">
      <Transition name="mnav">
        <div
          v-if="mobileNavOpen"
          class="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            class="mnav-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
            @click="mobileNavOpen = false"
          />
          <aside
            class="mnav-panel bg-background border-default-200 relative h-full w-72 max-w-[80vw] overflow-y-auto border-r p-4 shadow-xl"
          >
            <div class="mb-4 flex items-center justify-between">
              <span class="font-bold">Kun<span class="text-primary">Editor</span></span>
              <button
                type="button"
                aria-label="关闭导航菜单"
                class="text-default-500 hover:text-foreground cursor-pointer p-1"
                @click="mobileNavOpen = false"
              >
                <KunIcon name="lucide:x" />
              </button>
            </div>
            <DocsNav />
          </aside>
        </div>
      </Transition>
    </Teleport>

    <footer
      v-if="isHome"
      class="border-default-200 text-default-500 border-t px-5 py-6 text-center text-sm"
    >
      KunEditor · AGPL-3.0 · part of the
      <a href="https://github.com/kungal" class="text-primary">kungal</a>
      ecosystem
    </footer>
  </div>
</template>

<style scoped>
.mnav-enter-active,
.mnav-leave-active {
  transition: opacity 0.2s ease;
}
.mnav-enter-active .mnav-panel,
.mnav-leave-active .mnav-panel {
  transition: transform 0.2s ease;
}
.mnav-enter-from,
.mnav-leave-to {
  opacity: 0;
}
.mnav-enter-from .mnav-panel,
.mnav-leave-to .mnav-panel {
  transform: translateX(-100%);
}
</style>
