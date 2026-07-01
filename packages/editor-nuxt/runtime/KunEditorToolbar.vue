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
// KunButton/KunIcon/KunTooltip/KunPopover are auto-imported by @kungal/ui-nuxt in
// the consuming app; icons use the app's iconify set (e.g. lucide via @nuxt/icon).
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
  wrapInHeadingCommand,
  wrapInOrderedListCommand
} from '@milkdown/kit/preset/commonmark'
import { toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import {
  insertKunSpoilerCommand,
  toggleLatexCommand
} from '@kungal/editor-core/preset'
import { EMOJI } from '@kungal/editor-vue'
import type { KunEditorToolbarApi, StickerPack } from '@kungal/editor-vue'

const props = defineProps<KunEditorToolbarApi>()

const en = computed(() => props.locale.toLowerCase().startsWith('en'))
const t = computed(() => ({
  bold: en.value ? 'Bold' : '加粗',
  italic: en.value ? 'Italic' : '斜体',
  strike: en.value ? 'Strikethrough' : '删除线',
  code: en.value ? 'Inline code' : '行内代码',
  h1: en.value ? 'Heading 1' : '一级标题',
  h2: en.value ? 'Heading 2' : '二级标题',
  h3: en.value ? 'Heading 3' : '三级标题',
  bulletList: en.value ? 'Bullet list' : '无序列表',
  orderedList: en.value ? 'Ordered list' : '有序列表',
  quote: en.value ? 'Blockquote' : '引用块',
  codeBlock: en.value ? 'Code block' : '代码块',
  hr: en.value ? 'Divider' : '分隔线',
  spoiler: en.value ? 'Spoiler' : '隐藏文本',
  latex: en.value ? 'Math (LaTeX)' : '公式',
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

// Same command set + grouping as the default toolbar; `.key` is read at click
// time via api.run (populated once the editor is created).
const groups = computed<Tool[][]>(() => [
  [
    { icon: 'lucide:bold', title: t.value.bold, run: () => props.run(toggleStrongCommand.key) },
    { icon: 'lucide:italic', title: t.value.italic, run: () => props.run(toggleEmphasisCommand.key) },
    { icon: 'lucide:strikethrough', title: t.value.strike, run: () => props.run(toggleStrikethroughCommand.key) },
    { icon: 'lucide:code', title: t.value.code, run: () => props.run(toggleInlineCodeCommand.key) }
  ],
  [
    { icon: 'lucide:heading-1', title: t.value.h1, run: () => props.run(wrapInHeadingCommand.key, 1) },
    { icon: 'lucide:heading-2', title: t.value.h2, run: () => props.run(wrapInHeadingCommand.key, 2) },
    { icon: 'lucide:heading-3', title: t.value.h3, run: () => props.run(wrapInHeadingCommand.key, 3) }
  ],
  [
    { icon: 'lucide:list', title: t.value.bulletList, run: () => props.run(wrapInBulletListCommand.key) },
    { icon: 'lucide:list-ordered', title: t.value.orderedList, run: () => props.run(wrapInOrderedListCommand.key) },
    { icon: 'lucide:text-quote', title: t.value.quote, run: () => props.run(wrapInBlockquoteCommand.key) },
    { icon: 'lucide:square-code', title: t.value.codeBlock, run: () => props.run(createCodeBlockCommand.key, '') },
    { icon: 'lucide:minus', title: t.value.hr, run: () => props.run(insertHrCommand.key) }
  ],
  [
    { icon: 'lucide:eye-off', title: t.value.spoiler, run: () => props.run(insertKunSpoilerCommand.key) },
    { icon: 'lucide:sigma', title: t.value.latex, run: () => props.run(toggleLatexCommand.key) }
  ]
])

// Image upload — only when the host supplies uploadImage. Same adapter as
// paste/drop; on success inserts an image node at the cursor.
const uploadImage = computed(() => props.adapters.uploadImage)
const fileInput = ref<HTMLInputElement | null>(null)
const pickImage = () => fileInput.value?.click()
const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const upload = uploadImage.value
  if (!file || !upload) return
  try {
    const src = await upload(file)
    props.run(insertImageCommand.key, { src, title: file.name, alt: file.name })
  } catch {
    props.adapters.notify?.(en.value ? 'Image upload failed' : '图片上传失败', 'error')
  }
}

// Emoji (built-in) + sticker (adapter) picker in a KunPopover.
const showPicker = computed(() => props.features.sticker !== false)
const stickerSource = computed(() => props.adapters.stickerSource)
const hasSticker = computed(() => !!stickerSource.value)
const tab = ref<'emoji' | 'sticker'>('emoji')
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
    <template v-for="(group, gi) in groups" :key="gi">
      <span v-if="gi > 0" class="bg-default-200 mx-1 h-5 w-px" aria-hidden="true" />
      <KunTooltip v-for="(b, bi) in group" :key="bi" :text="b.title" :delay-show="300">
        <KunButton
          variant="light"
          size="sm"
          :is-icon-only="true"
          :aria-label="b.title"
          @click="b.run()"
        >
          <KunIcon :name="b.icon" />
        </KunButton>
      </KunTooltip>
    </template>

    <template v-if="uploadImage">
      <span class="bg-default-200 mx-1 h-5 w-px" aria-hidden="true" />
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
        ref="fileInput"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif"
        hidden
        @change="onFileChange"
      />
    </template>

    <template v-if="showPicker">
      <span class="bg-default-200 mx-1 h-5 w-px" aria-hidden="true" />
      <KunPopover position="bottom-start" :opaque="true" inner-class="w-72 p-2">
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

        <div v-if="hasSticker" class="mb-2 flex gap-1">
          <KunButton
            :variant="tab === 'emoji' ? 'flat' : 'light'"
            size="sm"
            @click="tab = 'emoji'"
            >{{ t.emoji }}</KunButton
          >
          <KunButton
            :variant="tab === 'sticker' ? 'flat' : 'light'"
            size="sm"
            @click="tab = 'sticker'"
            >{{ t.sticker }}</KunButton
          >
        </div>

        <div
          v-show="!hasSticker || tab === 'emoji'"
          class="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto"
        >
          <button
            v-for="(e, i) in EMOJI"
            :key="i"
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
                  v-for="(s, i) in pack.stickers"
                  :key="i"
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
    </template>
  </div>
</template>
