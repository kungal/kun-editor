<script setup lang="ts">
// The emoji + sticker panel, shared by the headless toolbar's picker and
// @kungal/editor-nuxt's KunUI toolbar (exported as KunStickerPanel).
//
// - Tabs 表情 | 贴纸 on top (the 贴纸 tab only with the `stickerSource`
//   adapter — stickers are images, an image-free editor gets emoji only). The
//   `#tabs` slot (`{ tabs, active, select }`) lets a host draw them with its
//   own tab component (KunEditorToolbar uses KunTab); the default is plain
//   buttons with the same structure.
// - 表情: 最近使用 (when there is any) then every emoji, one scroll with sticky
//   section headers, a dense grid.
// - 贴纸: a pack row under the tabs — 最近使用 (a clock) first when there is
//   any, then each pack's first sticker as its cover (name as tooltip and
//   aria-label), the active one highlighted. It scrolls sideways — wheel and
//   touch too, no visible scrollbar — and when it overflows, ‹ › at its ends
//   page by its visible width (smoothly; instantly under reduced motion), each
//   hidden at its own end. The grid below shows the selected pack: fixed 64px
//   cells, `loading="lazy"` images, so nothing shifts as they arrive.
// - 最近使用 is per viewer and per tab (two localStorage keys, see
//   ../sticker-recent), read when the panel opens and kept still while it is
//   open — a grid that reshuffles under the pointer after every pick is worse
//   than a stale one. A sticker no longer in the host's packs is never offered.
// - Keyboard: the grid is ONE tab stop (roving tabindex) — arrows move by the
//   cells' actual positions, Home / End jump, Enter / Space insert. The tabs and
//   the pack row are tablists (←/→). Esc is left to the wrapper (it closes).
//
// It inserts nothing itself: it emits `pick`, the wrapper inserts.
import type { KunEditorAdapters, KunEditorLocale, StickerPack } from '@kungal/editor-core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { EMOJI } from '../emoji'
import type { KunStickerPick } from '../sticker-recent'
import { pushRecent, readRecent } from '../sticker-recent'
import { entityDomId } from '../entity-shared'
import { prefersReducedMotion } from '../entity-drag'
import { TOOLBAR_ICONS } from '../toolbar-icons'

type Tab = 'emoji' | 'sticker'

const props = defineProps<{
  adapters: KunEditorAdapters
  locale?: KunEditorLocale
}>()
const emit = defineEmits<{ pick: [item: KunStickerPick] }>()

const en = computed(() => (props.locale ?? 'zh-cn').toLowerCase().startsWith('en'))
const t = computed(() =>
  en.value
    ? { emoji: 'Emoji', sticker: 'Stickers', recent: 'Recently used', tabs: 'Emoji or stickers', packs: 'Sticker packs', prev: 'Previous packs', next: 'More packs', loading: 'Loading stickers…', failed: 'Failed to load stickers', empty: 'No stickers' }
    : { emoji: '表情', sticker: '贴纸', recent: '最近使用', tabs: '表情或贴纸', packs: '贴纸包', prev: '上一页', next: '下一页', loading: '贴纸加载中…', failed: '贴纸加载失败', empty: '暂无贴纸' }
)

const hasStickers = computed(() => !!props.adapters.stickerSource)
const packs = shallowRef<StickerPack[]>([])
const loading = ref(false)
const failed = ref(false)
const recentEmoji = shallowRef<KunStickerPick[]>([])
const recentStickers = shallowRef<KunStickerPick[]>([])

const tab = ref<Tab>('emoji')
const tabs = computed(() =>
  hasStickers.value
    ? [
        { id: 'emoji' as Tab, label: t.value.emoji },
        { id: 'sticker' as Tab, label: t.value.sticker }
      ]
    : []
)

// ── Sticker packs ───────────────────────────────────────────────────────────
interface PackEntry {
  id: string
  label: string
  cover?: string
  items: KunStickerPick[]
}

const packEntries = computed<PackEntry[]>(() => {
  const inPacks = new Set(packs.value.flatMap((pack) => pack.stickers.map((s) => s.src)))
  const recent = recentStickers.value.filter(
    (item) => item.kind === 'sticker' && inPacks.has(item.src)
  )
  const out: PackEntry[] = []
  if (recent.length) {
    out.push({ id: 'recent', label: t.value.recent, items: recent })
  }
  packs.value.forEach((pack, index) => {
    if (pack.stickers.length) {
      out.push({
        id: `pack-${index}`,
        label: pack.name,
        cover: pack.stickers[0]?.src,
        items: pack.stickers.map((s) => ({ kind: 'sticker', src: s.src, name: s.name }))
      })
    }
  })
  return out
})
const pack = ref('')
watch(packEntries, (entries) => {
  if (!entries.some((entry) => entry.id === pack.value)) {
    pack.value = entries[0]?.id ?? ''
  }
})

// ── What the body shows ─────────────────────────────────────────────────────
interface Section {
  id: string
  label?: string
  kind: 'emoji' | 'sticker'
  items: KunStickerPick[]
}

const sections = computed<Section[]>(() => {
  if (tab.value === 'sticker') {
    const entry = packEntries.value.find((e) => e.id === pack.value)
    return entry ? [{ id: entry.id, kind: 'sticker', items: entry.items }] : []
  }
  const out: Section[] = []
  if (recentEmoji.value.length) {
    out.push({ id: 'recent', label: t.value.recent, kind: 'emoji', items: recentEmoji.value })
  }
  out.push({
    id: 'emoji',
    label: recentEmoji.value.length ? t.value.emoji : undefined,
    kind: 'emoji',
    items: EMOJI.map((text) => ({ kind: 'emoji', text }))
  })
  return out
})
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
const rowRef = ref<HTMLElement | null>(null)
const focusCell = ref(0)

const pick = (item: KunStickerPick, cell: number) => {
  focusCell.value = cell
  pushRecent(item)
  emit('pick', item)
}

const resetBody = () => {
  focusCell.value = 0
  if (bodyRef.value) bodyRef.value.scrollTop = 0
}
const selectTab = (next: string) => {
  if (next === 'emoji' || next === 'sticker') {
    tab.value = next
    resetBody()
  }
}
const selectPack = (id: string) => {
  pack.value = id
  resetBody()
  void nextTick(() =>
    rowRef.value
      ?.querySelector<HTMLElement>(`[data-pack="${id}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  )
}

// ── Pack row paging ─────────────────────────────────────────────────────────
const canPrev = ref(false)
const canNext = ref(false)
const updatePaging = () => {
  const row = rowRef.value
  if (!row) {
    canPrev.value = canNext.value = false
    return
  }
  canPrev.value = row.scrollLeft > 1
  canNext.value = row.scrollLeft + row.clientWidth < row.scrollWidth - 1
}
const page = (dir: -1 | 1) => {
  const row = rowRef.value
  if (!row) return
  row.scrollBy({
    left: dir * row.clientWidth,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth'
  })
}
/** A vertical wheel over the row scrolls it sideways. */
const onRowWheel = (event: WheelEvent) => {
  const row = rowRef.value
  if (!row || row.scrollWidth <= row.clientWidth) return
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    event.preventDefault()
    row.scrollLeft += event.deltaY
  }
}
let resize: ResizeObserver | null = null
watch(
  [rowRef, packEntries, tab],
  async () => {
    await nextTick()
    resize?.disconnect()
    if (rowRef.value && typeof ResizeObserver === 'function') {
      resize = new ResizeObserver(updatePaging)
      resize.observe(rowRef.value)
    }
    updatePaging()
  },
  { flush: 'post' }
)

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
  if (!current || !all) return from
  const centre = current.left + current.width / 2
  let rowTop: number | null = null
  let best = from
  let bestDx = Infinity
  for (const el of all) {
    const r = el.getBoundingClientRect()
    const beyond = dir > 0 ? r.top >= current.bottom - 2 : r.bottom <= current.top + 2
    if (!beyond) continue
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

/** ←/→ (Home / End) across a tablist's tabs, selecting as it goes. */
const walk = (
  event: KeyboardEvent,
  ids: string[],
  current: string,
  select: (id: string) => void,
  container: HTMLElement | null,
  attr: string
) => {
  const at = ids.indexOf(current)
  const next =
    event.key === 'ArrowRight' ? Math.min(ids.length - 1, at + 1)
    : event.key === 'ArrowLeft' ? Math.max(0, at - 1)
    : event.key === 'Home' ? 0
    : event.key === 'End' ? ids.length - 1
    : -1
  const id = ids[next]
  if (next < 0 || !id) return
  event.preventDefault()
  select(id)
  void nextTick(() => container?.querySelector<HTMLElement>(`[${attr}="${id}"]`)?.focus())
}
const tabsRef = ref<HTMLElement | null>(null)
const onTabsKeydown = (event: KeyboardEvent) =>
  walk(event, tabs.value.map((x) => x.id), tab.value, selectTab, tabsRef.value, 'data-tab')
const onRowKeydown = (event: KeyboardEvent) =>
  walk(event, packEntries.value.map((x) => x.id), pack.value, selectPack, rowRef.value, 'data-pack')

// ── Load ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  recentEmoji.value = readRecent('emoji')
  recentStickers.value = readRecent('sticker')
  const source = props.adapters.stickerSource
  if (!source) return
  loading.value = true
  try {
    packs.value = (await source()) ?? []
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
onBeforeUnmount(() => resize?.disconnect())

defineExpose({ focus: () => focusTo(focusCell.value) })
</script>

<template>
  <div class="kun-sticker-panel" :data-tab="tab">
    <slot v-if="tabs.length" name="tabs" :tabs="tabs" :active="tab" :select="selectTab">
      <div
        ref="tabsRef"
        class="kun-sticker-panel__tabs"
        role="tablist"
        :aria-label="t.tabs"
        @keydown="onTabsKeydown"
      >
        <button
          v-for="item in tabs"
          :key="item.id"
          type="button"
          role="tab"
          class="kun-sticker-panel__tab"
          :data-tab="item.id"
          :aria-selected="item.id === tab"
          :aria-controls="`${idBase}-body`"
          :tabindex="item.id === tab ? 0 : -1"
          @click="selectTab(item.id)"
        >
          {{ item.label }}
        </button>
      </div>
    </slot>

    <div v-if="tab === 'sticker' && packEntries.length" class="kun-sticker-panel__packs">
      <button
        v-show="canPrev"
        type="button"
        class="kun-sticker-panel__page"
        data-dir="prev"
        tabindex="-1"
        :aria-label="t.prev"
        @click="page(-1)"
      >
        ‹
      </button>
      <div
        ref="rowRef"
        class="kun-sticker-panel__pack-row"
        role="tablist"
        :aria-label="t.packs"
        @scroll.passive="updatePaging"
        @wheel="onRowWheel"
        @keydown="onRowKeydown"
      >
        <button
          v-for="entry in packEntries"
          :key="entry.id"
          type="button"
          role="tab"
          class="kun-sticker-panel__pack"
          :data-pack="entry.id"
          :aria-selected="entry.id === pack"
          :aria-controls="`${idBase}-body`"
          :tabindex="entry.id === pack ? 0 : -1"
          :title="entry.label"
          :aria-label="entry.label"
          @click="selectPack(entry.id)"
        >
          <span v-if="entry.id === 'recent'" class="kun-editor__icon" v-html="TOOLBAR_ICONS.clock" />
          <img v-else :src="entry.cover" alt="" width="28" height="28" draggable="false" />
        </button>
      </div>
      <button
        v-show="canNext"
        type="button"
        class="kun-sticker-panel__page"
        data-dir="next"
        tabindex="-1"
        :aria-label="t.next"
        @click="page(1)"
      >
        ›
      </button>
    </div>

    <div
      :id="`${idBase}-body`"
      ref="bodyRef"
      class="kun-sticker-panel__body"
      role="tabpanel"
      @keydown="onGridKeydown"
    >
      <section
        v-for="(section, si) in sections"
        :key="section.id"
        class="kun-sticker-panel__section"
        :data-kind="section.kind"
        :aria-label="section.label"
      >
        <div v-if="section.label" class="kun-sticker-panel__header">{{ section.label }}</div>
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
        v-if="tab === 'sticker' && !packEntries.length"
        class="kun-sticker-panel__hint"
        aria-live="polite"
      >
        {{ loading ? t.loading : failed ? t.failed : t.empty }}
      </div>
    </div>
  </div>
</template>
