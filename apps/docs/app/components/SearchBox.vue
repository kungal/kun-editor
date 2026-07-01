<script setup lang="ts">
// A client-side command palette over the docs pages. The index is built from
// site.config (route → label + description) — no backend, no build step. Opens
// with the button or Ctrl/Cmd-K; arrow keys + Enter to navigate.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { navigateTo } from '#imports'
import { displayLabel, pageMeta } from '~/site.config'

interface Entry {
  to: string
  label: string
  description: string
}

const index: Entry[] = Object.keys(pageMeta).map((to) => ({
  to,
  label: displayLabel(to),
  description: pageMeta[to]!.description
}))

const open = ref(false)
const query = ref('')
const active = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const results = computed<Entry[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return index
  return index.filter(
    (e) =>
      e.label.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.to.toLowerCase().includes(q)
  )
})

watch(results, () => {
  active.value = 0
})

const show = async () => {
  open.value = true
  query.value = ''
  active.value = 0
  await nextTick()
  inputRef.value?.focus()
}
const hide = () => {
  open.value = false
}

const go = (to: string) => {
  hide()
  navigateTo(to)
}

const onKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value ? hide() : show()
    return
  }
  if (!open.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    hide()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(active.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (e.key === 'Enter') {
    const picked = results.value[active.value]
    if (picked) {
      e.preventDefault()
      go(picked.to)
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <button
    type="button"
    class="border-default-200 text-default-500 hover:border-default-300 hover:text-foreground flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors"
    aria-label="搜索文档"
    @click="show"
  >
    <KunIcon name="lucide:search" />
    <span class="hidden sm:inline">搜索…</span>
    <kbd
      class="border-default-200 text-default-400 hidden rounded border px-1 text-xs sm:inline"
      >⌘K</kbd
    >
  </button>

  <Teleport to="body">
    <Transition name="pal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
        role="dialog"
        aria-modal="true"
        aria-label="搜索文档"
      >
        <div
          class="pal-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
          @click="hide"
        />
        <div
          class="pal-panel bg-background border-default-200 relative w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
        >
          <div class="border-default-200 flex items-center gap-2 border-b px-3">
            <KunIcon name="lucide:search" class="text-default-400" />
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              placeholder="搜索页面…"
              class="text-foreground flex-1 bg-transparent py-3 text-sm outline-none"
            />
          </div>
          <ul class="max-h-[50vh] overflow-y-auto p-2">
            <li v-if="!results.length" class="text-default-400 px-3 py-6 text-center text-sm">
              没有匹配的页面
            </li>
            <li v-for="(r, i) in results" :key="r.to">
              <button
                type="button"
                class="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors"
                :class="i === active ? 'bg-primary/10' : 'hover:bg-default-100'"
                @mouseenter="active = i"
                @click="go(r.to)"
              >
                <span
                  class="text-sm font-medium"
                  :class="i === active ? 'text-primary' : 'text-foreground'"
                  >{{ r.label }}</span
                >
                <span class="text-default-500 line-clamp-1 text-xs">{{
                  r.description
                }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pal-enter-active,
.pal-leave-active {
  transition: opacity 0.15s ease;
}
.pal-enter-active .pal-panel,
.pal-leave-active .pal-panel {
  transition: transform 0.15s ease;
}
.pal-enter-from,
.pal-leave-to {
  opacity: 0;
}
.pal-enter-from .pal-panel,
.pal-leave-to .pal-panel {
  transform: translateY(-8px);
}
</style>
