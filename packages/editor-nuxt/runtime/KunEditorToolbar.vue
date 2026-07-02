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
// Headings are ONE "text size" KunPopover (Paragraph / H1–H6, each shown at its
// own size — like the forum's header menu), driven by setHeadingCommand (absolute
// set). There is deliberately NO math button — an empty inline-math atom is a
// broken node; math is entered via the `$…$` / `$$` input rules.
//
// The emoji/sticker picker switches tabs with a <KunTab variant="underlined">
// (matching <KunEditorViewSwitch> and the forum's picker).
//
// KunButton/KunIcon/KunTooltip/KunPopover/KunTab are auto-imported by ui-nuxt in
// the consuming app; icons use the app's iconify set (e.g. lucide via @nuxt/icon).
// The container/menu utility classes are generated via @kungal/editor-nuxt's
// shipped tailwind.css (@source) — the consumer @imports it once.
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
import type { KunEditorToolbarApi, StickerPack } from '@kungal/editor-vue'

const props = defineProps<KunEditorToolbarApi>()

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

// Paragraph (level 0) + H1–H6, each rendered at its own size in the menu.
const headingOptions = computed(() => {
  const labels = en.value
    ? ['Paragraph', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6']
    : ['正文', '一级标题', '二级标题', '三级标题', '四级标题', '五级标题', '六级标题']
  const sizes = ['1rem', '1.6rem', '1.4rem', '1.25rem', '1.1rem', '1rem', '0.9rem']
  return labels.map((label, level) => ({ level, label, size: sizes[level] }))
})
const headingPopover = ref<{ close: () => void } | null>(null)
const setHeading = (level: number) => {
  props.run(setHeadingCommand.key, level)
  headingPopover.value?.close()
}

interface Tool {
  icon: string
  title: string
  run: () => void
}

// `.key` is read at click time via props.run (populated once the editor exists).
const groups = computed<Tool[][]>(() => [
  [
    { icon: 'lucide:bold', title: t.value.bold, run: () => props.run(toggleStrongCommand.key) },
    { icon: 'lucide:italic', title: t.value.italic, run: () => props.run(toggleEmphasisCommand.key) },
    { icon: 'lucide:strikethrough', title: t.value.strike, run: () => props.run(toggleStrikethroughCommand.key) },
    { icon: 'lucide:code', title: t.value.code, run: () => props.run(toggleInlineCodeCommand.key) }
  ],
  [
    { icon: 'lucide:list', title: t.value.bulletList, run: () => props.run(wrapInBulletListCommand.key) },
    { icon: 'lucide:list-ordered', title: t.value.orderedList, run: () => props.run(wrapInOrderedListCommand.key) },
    { icon: 'lucide:text-quote', title: t.value.quote, run: () => props.run(wrapInBlockquoteCommand.key) },
    { icon: 'lucide:square-code', title: t.value.codeBlock, run: () => props.run(createCodeBlockCommand.key, '') },
    { icon: 'lucide:minus', title: t.value.hr, run: () => props.run(insertHrCommand.key) }
  ],
  [
    { icon: 'lucide:eye-off', title: t.value.spoiler, run: () => props.run(insertKunSpoilerCommand.key) }
  ]
])

// Image upload button — shown only when the host supplies uploadImage. The
// upload itself goes through api.uploadImage, which shows an in-document
// "uploading…" placeholder at the caret (same UX as paste/drop).
const canUpload = computed(() => !!props.adapters.uploadImage)
const fileInput = ref<HTMLInputElement | null>(null)
const pickImage = () => fileInput.value?.click()
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
    <KunPopover ref="headingPopover" position="bottom-start" :opaque="true" inner-class="min-w-40 p-1">
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

    <template v-for="(group, gi) in groups" :key="gi">
      <span class="bg-default-200 mx-1 h-5 w-px" aria-hidden="true" />
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

    <template v-if="canUpload">
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
