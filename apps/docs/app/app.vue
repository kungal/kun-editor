<script setup lang="ts">
import { ref, watchEffect } from 'vue'

// KunUI dark mode keys off `.kun-dark-mode` on <html>.
const dark = ref(false)
watchEffect(() => {
  if (import.meta.client) {
    document.documentElement.classList.toggle('kun-dark-mode', dark.value)
  }
})
</script>

<template>
  <div class="bg-background text-foreground flex min-h-screen flex-col">
    <header
      class="border-default-200 bg-background/80 sticky top-0 z-40 flex items-center justify-between gap-3 border-b px-5 py-3 backdrop-blur"
    >
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
        <KunIcon name="lucide:pen-line" class="text-primary text-xl" />
        <span>KunEditor</span>
      </NuxtLink>

      <nav class="flex items-center gap-1">
        <KunButton variant="light" href="/playground">Playground</KunButton>
        <KunButton
          variant="light"
          href="https://github.com/kungal/kun-editor"
          target="_blank"
        >
          <KunIcon name="lucide:github" class="text-lg" />
        </KunButton>
        <button
          type="button"
          class="text-default-600 hover:text-foreground inline-flex cursor-pointer items-center p-1.5"
          aria-label="Toggle dark mode"
          @click="dark = !dark"
        >
          <KunIcon :name="dark ? 'lucide:sun' : 'lucide:moon'" class="text-lg" />
        </button>
      </nav>
    </header>

    <main class="flex-1">
      <NuxtPage />
    </main>

    <footer
      class="border-default-200 text-default-500 border-t px-5 py-6 text-center text-sm"
    >
      KunEditor · AGPL-3.0 · part of the
      <a href="https://github.com/kungal" class="text-primary">kungal</a>
      ecosystem
    </footer>
  </div>
</template>
