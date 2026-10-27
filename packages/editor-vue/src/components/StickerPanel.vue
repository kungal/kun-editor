<script setup lang="ts">
// The emoji + sticker panel — one continuous scroll with a bottom rail, the
// layout Telegram / Discord / Slack use. Shared by the headless toolbar's
// picker and @kungal/editor-nuxt's KunUI toolbar (exported as KunStickerPanel),
// so there is one implementation of it.
//
// - Sections, in rail order: 最近使用 (when there is any), 表情, then one per
//   sticker pack (from the `stickerSource` adapter, loaded on mount). Sticky
//   section headers; emoji in a dense grid, stickers in fixed 64px cells with
//   `loading="lazy"` images, so nothing shifts as they arrive.
// - The rail is a tablist: a clock, a smiley, then each pack's first sticker as
//   its cover (pack name as tooltip). It scrolls sideways when it overflows.
//   Scroll-spy keeps its selection on the section in view; picking a tab
//   scrolls there (instantly under reduced motion).
// - 最近使用 is per viewer (localStorage, see ../sticker-recent). It is read
//   when the panel opens and kept still while it is open — a grid that
//   reshuffles under the pointer after every pick is worse than a stale one.
//   A sticker no longer in the host's packs is never offered again.
// - Keyboard: the grid is ONE tab stop (roving tabindex) — arrows move by the
//   cells' actual positions (so ↑/↓ cross from the emoji grid into a sticker
//   grid sensibly), Home / End jump, Enter / Space insert; Tab goes on to the
//   rail, whose tabs ←/→ walk. Esc is left to the wrapper (it closes).
//
// It inserts nothing itself: it emits `pick`, the wrapper inserts.
import type { KunEditorAdapters, KunEditorLocale, StickerPack } from '@kungal/editor-core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { EMOJI } from '../emoji'
import type { KunStickerPick } from '../sticker-recent'
import { pushRecent, readRecent } from '../sticker-recent'
import { entityDomId } from '../entity-shared'
import { TOOLBAR_ICONS } from '../toolbar-icons'

const props = defineProps<{
  adapters: KunEditorAdapters
  locale?: KunEditorLocale
}>()
const emit = defineEmits<{ pick: [item: KunStickerPick] }>()

const en = computed(() => (props.locale ?? 'zh-cn').toLowerCase().startsWith('en'))
const t = computed(() =>
  en.value
    ? { recent: 'Recently used', emoji: 'Emoji', sections: 'Emoji & sticker sections', loading: 'Loading stickers…', failed: 'Failed to load stickers', empty: 'No stickers' }
    : { recent: '最近使用', emoji: '表情', sections: '表情与贴纸分类', loading: '贴纸加载中…', failed: '贴纸加载失败', empty: '暂无贴纸' }
)

const packs = shallowRef<StickerPack[]>([])
const loading = ref(false)
const failed = ref(false)
const recent = shallowRef<KunStickerPick[]>([])

interface Section {
  id: string
  label: string
  kind: 'recent' | 'emoji' | 'sticker'
  cover?: string
  items: KunStickerPick[]
}

const sections = computed<Section[]>(() => {
  const inPacks = new Set(packs.value.flatMap((pack) => pack.stickers.map((s) => s.src)))
  const recentItems = recent.value.filter(
    (item) => item.kind === 'emoji' || inPacks.has(item.src)
  )
  const out: Section[] = []
  if (recentItems.length) {
    out.push({ id: 'recent', label: t.value.recent, kind: 'recent', items: recentItems })
  }
  out.push({
    id: 'emoji',
    label: t.value.emoji,
    kind: 'emoji',
    items: EMOJI.map((text) => ({ kind: 'emoji', text }))
  })
  packs.value.forEach((pack, index) => {
    if (!pack.stickers.length) {
      return
    }
    out.push({
      id: `pack-${index}`,
      label: pack.name,
      kind: 'sticker',
      cover: pack.stickers[0]?.src,
      items: pack.stickers.map((s) => ({ kind: 'sticker', src: s.src, name: s.name }))
    })
  })
  return out
})

/** Index of the first cell of each section, in the flat roving order. */
const offsets = computed(() => {
  let n = 0
  return sections.value.map((section) => {
    const start = n
    n += section.items.length
    return start
  })
})
const cellCount = computed(() =>
  sections.value.reduce((n, section) => n + section.items.length, 0)
)

const idBase = entityDomId('kun-sticker-panel')
const bodyRef = ref<HTMLElement | null>(null)
const railRef = ref<HTMLElement | null>(null)
const focusCell = ref(0)
const activeSection = ref('')

const pick = (item: KunStickerPick, cell: number) => {
  focusCell.value = cell
  pushRecent(item)
  emit('pick', item)
}

// ── Scrolling: rail ↔ sections ──────────────────────────────────────────────
const reducedMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

/** While a tab's own scroll is under way, scroll-spy must not fight it. */
let spyPausedUntil = 0
let spyFrame = 0

const spy = () => {
  spyFrame = 0
  const body = bodyRef.value
  if (!body || Date.now() < spyPausedUntil) {
    return
  }
  const top = body.getBoundingClientRect().top
  let current = sections.value[0]?.id ?? ''
  for (const el of body.querySelectorAll<HTMLElement>('[data-section]')) {
    if (el.getBoundingClientRect().top - top <= 8) {
      current = el.dataset.section ?? current
    }
  }
  // Scrolled to the very end: the last section is the one in view, even when
  // it is too short to reach the top.
  if (body.scrollTop + body.clientHeight >= body.scrollHeight - 2) {
    current = sections.value[sections.value.length - 1]?.id ?? current
  }
  if (current !== activeSection.value) {
    activeSection.value = current
    railRef.value
      ?.querySelector<HTMLElement>(`[data-tab="${current}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}
const onScroll = () => {
  if (!spyFrame) {
    spyFrame = requestAnimationFrame(spy)
  }
}

const showSection = (id: string) => {
  const body = bodyRef.value
  const el = body?.querySelector<HTMLElement>(`[data-section="${id}"]`)
  if (!body || !el) {
    return
  }
  activeSection.value = id
  const smooth = !reducedMotion()
  spyPausedUntil = smooth ? Date.now() + 500 : 0
  body.scrollTo({ top: el.offsetTop, behavior: smooth ? 'smooth' : 'auto' })
}

// ── Keyboard ────────────────────────────────────────────────────────────────
const cellEl = (index: number) =>
  bodyRef.value?.querySelector<HTMLElement>(`[data-cell="${index}"]`) ?? null

const focusTo = (index: number) => {
  const target = Math.max(0, Math.min(cellCount.value - 1, index))
  focusCell.value = target
  const el = cellEl(target)
  el?.focus({ preventScroll: true })
  el?.scrollIntoView({ block: 'nearest' })
}

/** The cell above / below `from` by layout: the nearest row in that direction,
 * then the cell whose centre is closest horizontally. */
const vertical = (from: number, dir: 1 | -1): number => {
  const current = cellEl(from)?.getBoundingClientRect()
  const all = bodyRef.value?.querySelectorAll<HTMLElement>('[data-cell]')
  if (!current || !all) {
    return from
  }
  const centre = current.left + current.width / 2
  let rowTop: number | null = null
  let best = from
  let bestDx = Infinity
  for (const el of all) {
    const r = el.getBoundingClientRect()
    const beyond = dir > 0 ? r.top >= current.bottom - 2 : r.bottom <= current.top + 2
    if (!beyond) {
      continue
    }
    if (rowTop === null || (dir > 0 ? r.top < rowTop - 2 : r.top > rowTop + 2)) {
      rowTop = r.top
      bestDx = Infinity
    } else if (Math.abs(r.top - rowTop) > 2) {
      continue
    }
    const dx = Math.abs(r.left + r.width / 2 - centre)
    if (dx < bestDx) {
      bestDx = dx
      best = Number(el.dataset.cell)
    }
  }
  return best
}

const onGridKeydown = (event: KeyboardEvent) => {
  const from = focusCell.value
  const moves: Record<string, () => number> = {
    ArrowRight: () => from + 1,
    ArrowLeft: () => from - 1,
    ArrowDown: () => vertical(from, 1),
    ArrowUp: () => vertical(from, -1),
    Home: () => 0,
    End: () => cellCount.value - 1
  }
  const move = moves[event.key]
  if (move) {
    event.preventDefault()
    focusTo(move())
  }
}

const onRailKeydown = (event: KeyboardEvent) => {
  const ids = sections.value.map((s) => s.id)
  const at = ids.indexOf(activeSection.value)
  const next =
    event.key === 'ArrowRight'
      ? (at + 1) % ids.length
      : event.key === 'ArrowLeft'
        ? (at + ids.length - 1) % ids.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? ids.length - 1
            : -1
  const id = ids[next]
  if (next < 0 || !id) {
    return
  }
  event.preventDefault()
  showSection(id)
  void nextTick(() =>
    railRef.value?.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.focus()
  )
}

// ── Load ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  recent.value = readRecent()
  activeSection.value = sections.value[0]?.id ?? ''
  const source = props.adapters.stickerSource
  if (!source) {
    return
  }
  loading.value = true
  try {
    packs.value = (await source()) ?? []
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
onBeforeUnmount(() => {
  if (spyFrame) cancelAnimationFrame(spyFrame)
})

defineExpose({ focus: () => focusTo(focusCell.value) })
</script>

<template>
  <div class="kun-sticker-panel">
    <div
      ref="bodyRef"
      class="kun-sticker-panel__body"
      @scroll.passive="onScroll"
      @keydown="onGridKeydown"
    >
      <section
        v-for="(section, si) in sections"
        :id="`${idBase}-${section.id}`"
        :key="section.id"
        class="kun-sticker-panel__section"
        :data-section="section.id"
        :data-kind="section.kind"
        :aria-labelledby="`${idBase}-${section.id}-h`"
      >
        <div :id="`${idBase}-${section.id}-h`" class="kun-sticker-panel__header">
          {{ section.label }}
        </div>
        <div class="kun-sticker-panel__grid" role="group" :aria-label="section.label">
          <button
            v-for="(item, ii) in section.items"
            :key="item.kind === 'emoji' ? `e:${item.text}` : `s:${item.src}`"
            type="button"
            class="kun-sticker-panel__cell"
            :data-kind="item.kind"
            :data-cell="offsets[si]! + ii"
            :tabindex="offsets[si]! + ii === focusCell ? 0 : -1"
            :title="item.kind === 'sticker' ? item.name : undefined"
            :aria-label="item.kind === 'sticker' ? item.name : item.text"
            @click="pick(item, offsets[si]! + ii)"
            @focus="focusCell = offsets[si]! + ii"
          >
            <img
              v-if="item.kind === 'sticker'"
              :src="item.src"
              :alt="item.name"
              loading="lazy"
              decoding="async"
              draggable="false"
              width="56"
              height="56"
            />
            <template v-else>{{ item.text }}</template>
          </button>
        </div>
      </section>
      <div
        v-if="adapters.stickerSource && !packs.length"
        class="kun-sticker-panel__hint"
        aria-live="polite"
      >
        {{ loading ? t.loading : failed ? t.failed : t.empty }}
      </div>
    </div>

    <div
      ref="railRef"
      class="kun-sticker-panel__rail"
      role="tablist"
      :aria-label="t.sections"
      @keydown="onRailKeydown"
    >
      <button
        v-for="section in sections"
        :key="section.id"
        type="button"
        role="tab"
        class="kun-sticker-panel__tab"
        :data-tab="section.id"
        :aria-selected="section.id === activeSection"
        :aria-controls="`${idBase}-${section.id}`"
        :tabindex="section.id === activeSection ? 0 : -1"
        :title="section.label"
        :aria-label="section.label"
        @click="showSection(section.id)"
      >
        <span v-if="section.kind === 'recent'" class="kun-editor__icon" v-html="TOOLBAR_ICONS.clock" />
        <span v-else-if="section.kind === 'emoji'" class="kun-editor__icon" v-html="TOOLBAR_ICONS.smile" />
        <img v-else :src="section.cover" alt="" width="28" height="28" draggable="false" />
      </button>
    </div>
  </div>
</template>
