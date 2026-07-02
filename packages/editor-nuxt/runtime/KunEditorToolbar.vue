<script setup lang="ts">
// A KunUI-built toolbar for <KunEditor>, dropped into its #toolbar scoped slot:
//
//   <KunEditor v-model="md" :adapters="a">
//     <template #toolbar="api"><KunEditorToolbar v-bind="api" /></template>
//   </KunEditor>
//
// This lives in @kungal/editor-nuxt (the layer that already assumes @kungal/
// ui-nuxt), NOT in the headless @kungal/editor-vue — so editor-vue keeps its
// zero-UI-dep promise while the KunUI ecosystem (forum, moyu) gets native
// KunButton / KunIcon / KunTooltip / KunPopover chrome. It drives the editor
// purely through the slot API props (KunEditorToolbarApi) — no useInstance.
//
// Button order/set is customizable via `:items` (a list of KunToolbarItem ids,
// '|' = divider) so a host can reorder or subset the built-in buttons and apply
// the SAME order across every editor, instead of rebuilding a custom toolbar.
// Defaults to the standard layout. image/picker are auto-dropped without their
// adapter/feature, and dividers collapse around removed items.
//
// Headings are ONE "text size" KunPopover (Paragraph / H1–H6). There is NO math
// button — an empty inline-math atom is a broken node; math is via `$…$` / `$$`.
// KunButton/KunIcon/KunTooltip/KunPopover/KunTab are auto-imported by ui-nuxt.
import { computed, ref } from 'vue'
import {
  createCodeBlockCommand,
  insertHrCommand,
  insertImageCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand
} from '@milkdown/kit/preset/commonmark'
import { toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import {
  insertKunSpoilerCommand,
  setHeadingCommand
} from '@kungal/editor-core/preset'
import { EMOJI } from '@kungal/editor-vue'
import type {
  KunEditorToolbarApi,
  KunToolbarItem,
  StickerPack
} from '@kungal/editor-vue'

const props = defineProps<
  KunEditorToolbarApi & {
    /** Ordered button ids ('|' = divider). Defaults to the standard layout. */
    items?: KunToolbarItem[]
  }
>()

const DEFAULT_ITEMS: KunToolbarItem[] = [
  'heading',
  '|',
  'bold',
  'italic',
  'strike',
  'code',
  '|',
  'bulletList',
  'orderedList',
  'quote',
  'codeBlock',
  'hr',
  '|',
  'spoiler',
  '|',
  'image',
  '|',
  'picker'
]

const en = computed(() => props.locale.toLowerCase().startsWith('en'))
const t = computed(() => ({
  textSize: en.value ? 'Text size' : '文本大小',
  bold: en.value ? 'Bold' : '加粗',
  italic: en.value ? 'Italic' : '斜体',
  strike: en.value ? 'Strikethrough' : '删除线',
  code: en.value ? 'Inline code' : '行内代码',
  bulletList: en.value ? 'Bullet list' : '无序列表',
  orderedList: en.value ? 'Ordered list' : '有序列表',
  quote: en.value ? 'Blockquote' : '引用块',
  codeBlock: en.value ? 'Code block' : '代码块',
  hr: en.value ? 'Divider' : '分隔线',
  spoiler: en.value ? 'Spoiler' : '隐藏文本',
  image: en.value ? 'Upload image' : '上传图片',
  picker: en.value ? 'Emoji & stickers' : '表情与贴纸',
  emoji: en.value ? 'Emoji' : '表情',
  sticker: en.value ? 'Stickers' : '贴纸',
  empty: en.value ? 'No stickers' : '暂无贴纸',
  failed: en.value ? 'Failed to load stickers' : '贴纸加载失败'
}))

interface Tool {
  icon: string
  title: string
  run: () => void
}

// The plain command buttons (everything except heading / image / picker).
// `.key` is read at click time via props.run (populated once the editor exists).
const commandButtons = computed<Record<string, Tool>>(() => ({
  bold: { icon: 'lucide:bold', title: t.value.bold, run: () => props.run(toggleStrongCommand.key) },
  italic: { icon: 'lucide:italic', title: t.value.italic, run: () => props.run(toggleEmphasisCommand.key) },
  strike: { icon: 'lucide:strikethrough', title: t.value.strike, run: () => props.run(toggleStrikethroughCommand.key) },
  code: { icon: 'lucide:code', title: t.value.code, run: () => props.run(toggleInlineCodeCommand.key) },
  bulletList: { icon: 'lucide:list', title: t.value.bulletList, run: () => props.run(wrapInBulletListCommand.key) },
  orderedList: { icon: 'lucide:list-ordered', title: t.value.orderedList, run: () => props.run(wrapInOrderedListCommand.key) },
  quote: { icon: 'lucide:text-quote', title: t.value.quote, run: () => props.run(wrapInBlockquoteCommand.key) },
  codeBlock: { icon: 'lucide:square-code', title: t.value.codeBlock, run: () => props.run(createCodeBlockCommand.key, '') },
  hr: { icon: 'lucide:minus', title: t.value.hr, run: () => props.run(insertHrCommand.key) },
  spoiler: { icon: 'lucide:eye-off', title: t.value.spoiler, run: () => props.run(insertKunSpoilerCommand.key) }
}))

type RenderItem =
  | { kind: 'divider' }
  | { kind: 'heading' }
  | { kind: 'image' }
  | { kind: 'picker' }
  | { kind: 'button'; tool: Tool }

// Resolve `items` → renderables: drop image/picker when unavailable, map command
// ids to their button, then collapse consecutive/leading/trailing dividers so a
// removed item never leaves a doubled or dangling separator.
const resolvedItems = computed<RenderItem[]>(() => {
  const buttons = commandButtons.value
  const mapped = (props.items ?? DEFAULT_ITEMS)
    .filter((it) =>
      it === 'image' ? canUpload.value : it === 'picker' ? showPicker.value : true
    )
    .map<RenderItem | null>((it) => {
      if (it === '|') return { kind: 'divider' }
      if (it === 'heading') return { kind: 'heading' }
      if (it === 'image') return { kind: 'image' }
      if (it === 'picker') return { kind: 'picker' }
      const tool = buttons[it]
      return tool ? { kind: 'button', tool } : null
    })
    .filter((x): x is RenderItem => x !== null)

  const out: RenderItem[] = []
  for (const it of mapped) {
    if (it.kind === 'divider' && (out.length === 0 || out[out.length - 1]?.kind === 'divider')) {
      continue
    }
    out.push(it)
  }
  while (out.length && out[out.length - 1]?.kind === 'divider') {
    out.pop()
  }
  return out
})

// Paragraph (level 0) + H1–H6, each rendered at its own size in the menu.
const headingOptions = computed(() => {
  const labels = en.value
    ? ['Paragraph', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6']
    : ['正文', '一级标题', '二级标题', '三级标题', '四级标题', '五级标题', '六级标题']
  const sizes = ['1rem', '1.6rem', '1.4rem', '1.25rem', '1.1rem', '1rem', '0.9rem']
  return labels.map((label, level) => ({ level, label, size: sizes[level] }))
})
// Function refs (these elements live inside a v-for, where string refs collect
// into arrays). Each renders at most once.
let headingPopoverEl: { close: () => void } | null = null
const setHeadingPopover = (el: unknown) => {
  headingPopoverEl = el as { close: () => void } | null
}
const setHeading = (level: number) => {
  props.run(setHeadingCommand.key, level)
  headingPopoverEl?.close()
}

// Image upload — via api.uploadImage (shows the in-document "uploading…"
// placeholder). Only rendered when the host supplies uploadImage.
const canUpload = computed(() => !!props.adapters.uploadImage)
let fileInputEl: HTMLInputElement | null = null
const setFileInput = (el: unknown) => {
  fileInputEl = el as HTMLInputElement | null
}
const pickImage = () => fileInputEl?.click()
const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) {
    props.uploadImage(file)
  }
}

// Emoji (built-in) + sticker (adapter) picker in a KunPopover.
const showPicker = computed(() => props.features.sticker !== false)
const stickerSource = computed(() => props.adapters.stickerSource)
const hasSticker = computed(() => !!stickerSource.value)
const tab = ref('emoji') // 'emoji' | 'sticker' — widened to string for KunTab v-model
const packs = ref<StickerPack[]>([])
const loaded = ref(false)
const loadFailed = ref(false)
const loadStickers = async () => {
  const source = stickerSource.value
  if (loaded.value || !source) return
  loaded.value = true
  try {
    packs.value = await source()
  } catch {
    loadFailed.value = true
  }
}
const insertSticker = (src: string, name: string) =>
  props.run(insertImageCommand.key, { src, title: name, alt: name })
</script>

<template>
  <div class="flex flex-wrap items-center gap-0.5">
    <template v-for="(item, i) in resolvedItems" :key="i">
      <span
        v-if="item.kind === 'divider'"
        class="bg-default-200 mx-1 h-5 w-px"
        aria-hidden="true"
      />

      <KunPopover
        v-else-if="item.kind === 'heading'"
        :ref="setHeadingPopover"
        position="bottom-start"
        :opaque="true"
        inner-class="min-w-40 p-1"
      >
        <template #trigger>
          <KunButton variant="light" size="sm" :aria-label="t.textSize">
            {{ t.textSize }}
            <KunIcon name="lucide:chevron-down" />
          </KunButton>
        </template>
        <button
          v-for="o in headingOptions"
          :key="o.level"
          type="button"
          class="hover:bg-default-100 flex w-full items-center rounded px-3 py-1.5 text-left leading-tight"
          :style="{ fontSize: o.size }"
          @click="setHeading(o.level)"
        >
          {{ o.label }}
        </button>
      </KunPopover>

      <template v-else-if="item.kind === 'image'">
        <KunTooltip :text="t.image" :delay-show="300">
          <KunButton
            variant="light"
            size="sm"
            :is-icon-only="true"
            :aria-label="t.image"
            @click="pickImage"
          >
            <KunIcon name="lucide:image" />
          </KunButton>
        </KunTooltip>
        <input
          :ref="setFileInput"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif"
          hidden
          @change="onFileChange"
        />
      </template>

      <KunPopover
        v-else-if="item.kind === 'picker'"
        position="bottom-start"
        :opaque="true"
        inner-class="w-72 p-2"
      >
        <template #trigger>
          <KunButton
            variant="light"
            size="sm"
            :is-icon-only="true"
            :aria-label="t.picker"
            @click="hasSticker && loadStickers()"
          >
            <KunIcon name="lucide:smile-plus" />
          </KunButton>
        </template>

        <KunTab
          v-if="hasSticker"
          v-model="tab"
          :items="[
            { value: 'emoji', textValue: t.emoji },
            { value: 'sticker', textValue: t.sticker }
          ]"
          variant="underlined"
          color="primary"
          :full-width="true"
          class="mb-2"
        />

        <div
          v-show="!hasSticker || tab === 'emoji'"
          class="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto"
        >
          <button
            v-for="(e, ei) in EMOJI"
            :key="ei"
            type="button"
            class="hover:bg-default-100 rounded p-1 text-lg leading-none"
            @click="props.insertText(e)"
          >
            {{ e }}
          </button>
        </div>

        <div v-if="hasSticker" v-show="tab === 'sticker'" class="max-h-56 overflow-y-auto">
          <template v-if="packs.length">
            <div v-for="pack in packs" :key="pack.name" class="mb-2">
              <div class="text-default-500 mb-1 text-xs">{{ pack.name }}</div>
              <div class="grid grid-cols-4 gap-1">
                <button
                  v-for="(s, si) in pack.stickers"
                  :key="si"
                  type="button"
                  class="hover:bg-default-100 rounded p-1"
                  :title="s.name"
                  @click="insertSticker(s.src, s.name)"
                >
                  <img :src="s.src" :alt="s.name" loading="lazy" class="h-14 w-14 object-contain" />
                </button>
              </div>
            </div>
          </template>
          <div v-else class="text-default-500 p-4 text-center text-sm">
            {{ loadFailed ? t.failed : t.empty }}
          </div>
        </div>
      </KunPopover>

      <KunTooltip
        v-else-if="item.kind === 'button'"
        :text="item.tool.title"
        :delay-show="300"
      >
        <KunButton
          variant="light"
          size="sm"
          :is-icon-only="true"
          :aria-label="item.tool.title"
          @click="item.tool.run()"
        >
          <KunIcon :name="item.tool.icon" />
        </KunButton>
      </KunTooltip>
    </template>
  </div>
</template>
