<script setup lang="ts">
// The merged sticker + emoji picker — a toolbar popover. Ported from the forum's
// sticker/emoji Containers + the Menu popover, made self-contained (no
// @kungal/ui-vue): a plain trigger button + a click-outside popover panel.
//
// - Emoji: a built-in unicode set (../emoji), inserted as plain text. Always
//   available; no adapter, no server.
// - Stickers: adapter-driven — packs come from the injected `stickerSource`
//   adapter (loaded lazily on first open), each sticker inserted as an image
//   node. The sticker tab only shows when the adapter is present (stickers ARE
//   images, so an image-free editor gets emoji only).
//
// Lives inside <MilkdownProvider> (rendered by EditorToolbar) so useInstance()
// reaches the editor.
import { callCommand } from '@milkdown/kit/utils'
import { insertImageCommand } from '@milkdown/kit/preset/commonmark'
import { editorViewCtx } from '@milkdown/kit/core'
import { useInstance } from '@milkdown/vue'
import type { StickerPack } from '@kungal/editor-core'
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import { EMOJI } from '../emoji'
import { TOOLBAR_ICONS } from '../toolbar-icons'

const [, getEditor] = useInstance()
const ctx = inject(KUN_EDITOR_CONTEXT)
const stickerSource = ctx?.adapters.stickerSource
const hasSticker = !!stickerSource
const isEnglish = computed(() =>
  (ctx?.locale ?? 'zh-cn').toLowerCase().startsWith('en')
)

const labels = computed(() =>
  isEnglish.value
    ? { trigger: 'Emoji & stickers', emoji: 'Emoji', sticker: 'Stickers', empty: 'No stickers', failed: 'Failed to load stickers' }
    : { trigger: '表情与贴纸', emoji: '表情', sticker: '贴纸', empty: '暂无贴纸', failed: '贴纸加载失败' }
)

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
type Tab = 'emoji' | 'sticker'
const tab = ref<Tab>('emoji')

const packs = ref<StickerPack[]>([])
const loaded = ref(false)
const loadFailed = ref(false)

const loadStickers = async () => {
  if (loaded.value || !stickerSource) {
    return
  }
  loaded.value = true
  try {
    packs.value = await stickerSource()
  } catch {
    loadFailed.value = true
  }
}

const toggle = () => {
  open.value = !open.value
  if (open.value && hasSticker) {
    loadStickers()
  }
}

// Close on outside click. The trigger + panel are inside rootRef, so clicks on
// them don't close (the panel stays open for inserting multiple).
const onDocClick = (e: MouseEvent) => {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

// Inserts act on editor STATE directly (no focus needed) so clicking the
// popover — which blurs the editor — still inserts at the retained selection.
const insertEmoji = (emoji: string) => {
  getEditor()?.action((c) => {
    const view = c.get(editorViewCtx)
    const { state } = view
    view.dispatch(state.tr.insertText(emoji, state.selection.from))
  })
}

const insertSticker = (src: string, name: string) => {
  getEditor()?.action(
    callCommand(insertImageCommand.key, { src, title: name, alt: name })
  )
}
</script>

<template>
  <div ref="rootRef" class="kun-editor__picker">
    <button
      type="button"
      class="kun-editor__tool"
      :title="labels.trigger"
      :aria-label="labels.trigger"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="kun-editor__icon" v-html="TOOLBAR_ICONS.smile" />
    </button>

    <div v-show="open" class="kun-editor__picker-panel">
      <div v-if="hasSticker" class="kun-editor__picker-tabs" role="tablist">
        <button
          type="button"
          class="kun-editor__picker-tab"
          :data-active="tab === 'emoji'"
          @click="tab = 'emoji'"
        >
          {{ labels.emoji }}
        </button>
        <button
          type="button"
          class="kun-editor__picker-tab"
          :data-active="tab === 'sticker'"
          @click="tab = 'sticker'"
        >
          {{ labels.sticker }}
        </button>
      </div>

      <div
        v-show="!hasSticker || tab === 'emoji'"
        class="kun-editor__emoji-grid"
      >
        <button
          v-for="(e, i) in EMOJI"
          :key="i"
          type="button"
          class="kun-editor__emoji"
          @click="insertEmoji(e)"
        >
          {{ e }}
        </button>
      </div>

      <div
        v-if="hasSticker"
        v-show="tab === 'sticker'"
        class="kun-editor__sticker-body"
      >
        <template v-if="packs.length">
          <div v-for="pack in packs" :key="pack.name" class="kun-editor__pack">
            <div class="kun-editor__pack-name">{{ pack.name }}</div>
            <div class="kun-editor__sticker-grid">
              <button
                v-for="(s, i) in pack.stickers"
                :key="i"
                type="button"
                class="kun-editor__sticker"
                :title="s.name"
                @click="insertSticker(s.src, s.name)"
              >
                <img :src="s.src" :alt="s.name" loading="lazy" />
              </button>
            </div>
          </div>
        </template>
        <div v-else class="kun-editor__picker-hint">
          {{ loadFailed ? labels.failed : labels.empty }}
        </div>
      </div>
    </div>
  </div>
</template>

