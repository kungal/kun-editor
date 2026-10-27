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
import {
  KunEntityPicker,
  KunEntityTypePicker,
  KunStickerPanel
} from '@kungal/editor-vue'
import type {
  EntityHit,
  EntityTypeItem,
  KunEditorToolbarApi,
  KunStickerPick,
  KunToggleMark,
  KunToolbarItem
} from '@kungal/editor-vue'

/** Per-item chrome a host may override: the KunIcon name, and the label
 * (which drives BOTH the tooltip and the aria-label). */
export interface KunToolbarItemOverride {
  icon?: string
  label?: string
}

const props = defineProps<
  KunEditorToolbarApi & {
    /** Ordered button ids ('|' = divider). Defaults to the standard layout. */
    items?: KunToolbarItem[]
    /**
     * Swap a built-in button's icon and / or label, e.g.
     * `{ entityPicker: { icon: 'lucide:id-card', label: '插入条目卡片' } }`.
     * The label is the tooltip and the aria-label alike.
     */
    itemOverrides?: Partial<Record<KunToolbarItem, KunToolbarItemOverride>>
  }
>()

const DEFAULT_ITEMS: KunToolbarItem[] = [
  'heading',
  '|',
  'bold',
  'italic',
  'strike',
  'code',
  'link',
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
  'entityPicker',
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
  link: en.value ? 'Link' : '链接',
  linkPlaceholder: en.value ? 'https://…' : 'https://…',
  linkApply: en.value ? 'Apply' : '确定',
  bulletList: en.value ? 'Bullet list' : '无序列表',
  orderedList: en.value ? 'Ordered list' : '有序列表',
  quote: en.value ? 'Blockquote' : '引用块',
  codeBlock: en.value ? 'Code block' : '代码块',
  hr: en.value ? 'Divider' : '分隔线',
  spoiler: en.value ? 'Spoiler' : '隐藏文本',
  image: en.value ? 'Upload image' : '上传图片',
  picker: en.value ? 'Emoji & stickers' : '表情与贴纸',
  entity: en.value ? 'Insert reference' : '插入引用'
}))

interface Tool {
  icon: string
  title: string
  run: () => void
  // The toggle mark this button flips, when any. Buttons with a mark render a
  // pressed/active state (see the template) driven by `api.activeMarks`.
  mark?: KunToggleMark
}

/** An item's chrome after the host's `itemOverrides`. */
const chromeOf = (id: KunToolbarItem, icon: string, label: string) => {
  const override = props.itemOverrides?.[id]
  return { icon: override?.icon || icon, label: override?.label || label }
}
// The non-command items' chrome (heading's icon is its chevron).
const chrome = computed(() => ({
  heading: chromeOf('heading', 'lucide:chevron-down', t.value.textSize),
  link: chromeOf('link', 'lucide:link', t.value.link),
  image: chromeOf('image', 'lucide:image', t.value.image),
  picker: chromeOf('picker', 'lucide:smile-plus', t.value.picker),
  entityPicker: chromeOf('entityPicker', 'lucide:square-arrow-out-up-right', t.value.entity)
}))

// The plain command buttons (everything except heading / image / picker).
// `.key` is read at click time via props.run (populated once the editor exists).
const baseCommandButtons = computed<Record<string, Tool>>(() => ({
  bold: { icon: 'lucide:bold', title: t.value.bold, run: () => props.run(toggleStrongCommand.key), mark: 'bold' },
  italic: { icon: 'lucide:italic', title: t.value.italic, run: () => props.run(toggleEmphasisCommand.key), mark: 'italic' },
  strike: { icon: 'lucide:strikethrough', title: t.value.strike, run: () => props.run(toggleStrikethroughCommand.key), mark: 'strike' },
  code: { icon: 'lucide:code', title: t.value.code, run: () => props.run(toggleInlineCodeCommand.key), mark: 'code' },
  bulletList: { icon: 'lucide:list', title: t.value.bulletList, run: () => props.run(wrapInBulletListCommand.key) },
  orderedList: { icon: 'lucide:list-ordered', title: t.value.orderedList, run: () => props.run(wrapInOrderedListCommand.key) },
  quote: { icon: 'lucide:text-quote', title: t.value.quote, run: () => props.run(wrapInBlockquoteCommand.key) },
  codeBlock: { icon: 'lucide:square-code', title: t.value.codeBlock, run: () => props.run(createCodeBlockCommand.key, '') },
  hr: { icon: 'lucide:minus', title: t.value.hr, run: () => props.run(insertHrCommand.key) },
  spoiler: { icon: 'lucide:eye-off', title: t.value.spoiler, run: () => props.run(insertKunSpoilerCommand.key), mark: 'spoiler' }
}))
const commandButtons = computed<Record<string, Tool>>(() =>
  Object.fromEntries(
    Object.entries(baseCommandButtons.value).map(([id, tool]) => {
      const { icon, label } = chromeOf(id as KunToolbarItem, tool.icon, tool.title)
      return [id, { ...tool, icon, title: label }]
    })
  )
)

type RenderItem =
  | { kind: 'divider' }
  | { kind: 'heading' }
  | { kind: 'link' }
  | { kind: 'image' }
  | { kind: 'picker' }
  | { kind: 'entityPicker' }
  | { kind: 'button'; tool: Tool }

// Resolve `items` → renderables: drop image/picker when unavailable, map command
// ids to their button, then collapse consecutive/leading/trailing dividers so a
// removed item never leaves a doubled or dangling separator.
const resolvedItems = computed<RenderItem[]>(() => {
  const buttons = commandButtons.value
  const mapped = (props.items ?? DEFAULT_ITEMS)
    .filter((it) =>
      it === 'image'
        ? canUpload.value
        : it === 'picker'
          ? showPicker.value
          : it === 'entityPicker'
            ? canPickEntity.value
            : true
    )
    .map<RenderItem | null>((it) => {
      if (it === '|') return { kind: 'divider' }
      if (it === 'heading') return { kind: 'heading' }
      if (it === 'link') return { kind: 'link' }
      if (it === 'image') return { kind: 'image' }
      if (it === 'picker') return { kind: 'picker' }
      if (it === 'entityPicker') return { kind: 'entityPicker' }
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

// Link — a KunPopover with a URL input. Applies to the current selection (or
// inserts the URL as linked text when nothing is selected). The editor keeps its
// selection while the popover input is focused, so api.insertLink wraps it.
const linkUrl = ref('')
let linkPopoverEl: { close: () => void } | null = null
const setLinkPopover = (el: unknown) => {
  linkPopoverEl = el as { close: () => void } | null
}
const applyLink = () => {
  const href = linkUrl.value.trim()
  if (href) {
    props.insertLink({ href })
  }
  linkUrl.value = ''
  linkPopoverEl?.close()
}

// When the host supplies a `linkPrompt` adapter, the link button uses THAT (its
// own modal) instead of the inline popover — so one override covers the toolbar,
// the default toolbar, and the selection bubble alike.
const useLinkAdapter = computed(() => !!props.adapters.linkPrompt)
const applyLinkFromAdapter = async () => {
  const raw = await props.adapters.linkPrompt?.({ text: '' })
  const href = raw?.trim()
  if (href) {
    props.insertLink({ href })
  }
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

// Emoji (built-in) + sticker (adapter) picker: a KunPopover around the shared
// <KunStickerPanel> (recently used / emoji / one section per pack, bottom
// rail, keyboard grid). Emoji go in as text, stickers as image nodes.
const showPicker = computed(() => props.features.sticker !== false)
const insertPick = (item: KunStickerPick) => {
  if (item.kind === 'emoji') {
    props.insertText(item.text)
  } else {
    props.run(insertImageCommand.key, { src: item.src, title: item.name, alt: item.name })
  }
}

// Entity picker — the `/` menu's toolbar twin. Needs the entity adapters; the
// pick lands where the caret was (a card in an empty paragraph, else a chip).
const canPickEntity = computed(
  () =>
    props.features.entity !== false &&
    !!props.adapters.entityFromUrl &&
    (!!props.adapters.entityPrompt || !!props.adapters.searchEntities) &&
    !!props.adapters.entityTypes?.length
)
let entityPopoverEl: { close: () => void } | null = null
const setEntityPopover = (el: unknown) => {
  entityPopoverEl = el as { close: () => void } | null
}
// Called from the template through this function, never inline: a `let` only
// reassigned in the ref callback narrows to `null` in template expressions, so
// a host's vue-tsc (this layer ships .vue sources) reads `?.close` as `never`.
const closeEntityPopover = () => entityPopoverEl?.close()
const pickEntity = (hit: EntityHit) => {
  closeEntityPopover()
  props.insertEntity(hit.ref)
}
// With the host's own search (`entityPrompt`) the popover is a type menu: a
// pick closes it and hands off to the host's modal.
const pickEntityType = (item: EntityTypeItem) => {
  closeEntityPopover()
  props.promptEntity(item.type)
}
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
          <KunButton variant="light" size="sm" :aria-label="chrome.heading.label">
            {{ chrome.heading.label }}
            <KunIcon :name="chrome.heading.icon" />
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

      <KunTooltip
        v-else-if="item.kind === 'link' && useLinkAdapter"
        :text="chrome.link.label"
        :delay-show="300"
      >
        <KunButton
          variant="light"
          size="sm"
          :is-icon-only="true"
          :aria-label="chrome.link.label"
          @click="applyLinkFromAdapter"
        >
          <KunIcon :name="chrome.link.icon" />
        </KunButton>
      </KunTooltip>

      <KunPopover
        v-else-if="item.kind === 'link'"
        :ref="setLinkPopover"
        position="bottom-start"
        :opaque="true"
        inner-class="w-64 p-2"
      >
        <template #trigger>
          <KunTooltip :text="chrome.link.label" :delay-show="300">
            <KunButton
              variant="light"
              size="sm"
              :is-icon-only="true"
              :aria-label="chrome.link.label"
            >
              <KunIcon :name="chrome.link.icon" />
            </KunButton>
          </KunTooltip>
        </template>
        <!-- `type="text"` + `inputmode="url"`, never `type="url"`: this IS a
             form, so native URL validation would block submit on a schemeless
             `www.a.com/x` — the very input insertLinkCommand normalizes.

             NO `autofocus`: KunPopover already focuses the first focusable
             element in its panel when it opens, and does it with
             `preventScroll`. The input's own mount-time focus ran a tick
             EARLIER — while the panel, teleported to <body>, was still sitting
             at the document origin because floating-ui had not measured yet —
             so "scroll the focused element into view" yanked the whole page to
             the top. KunUI ≥ 2.26.0 passes preventScroll there too, but this
             prop was doing nothing the popover wasn't already doing right. -->
        <form class="flex items-center gap-1" @submit.prevent="applyLink">
          <KunInput
            v-model="linkUrl"
            type="text"
            inputmode="url"
            size="sm"
            :placeholder="t.linkPlaceholder"
            class="flex-1"
          />
          <KunButton type="submit" variant="flat" color="primary" size="sm">
            {{ t.linkApply }}
          </KunButton>
        </form>
      </KunPopover>

      <template v-else-if="item.kind === 'image'">
        <KunTooltip :text="chrome.image.label" :delay-show="300">
          <KunButton
            variant="light"
            size="sm"
            :is-icon-only="true"
            :aria-label="chrome.image.label"
            @click="pickImage"
          >
            <KunIcon :name="chrome.image.icon" />
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
        inner-class="w-[360px] max-w-[calc(100vw-1rem)] p-0 overflow-hidden"
      >
        <template #trigger>
          <KunTooltip :text="chrome.picker.label" :delay-show="300">
            <KunButton
              variant="light"
              size="sm"
              :is-icon-only="true"
              :aria-label="chrome.picker.label"
            >
              <KunIcon :name="chrome.picker.icon" />
            </KunButton>
          </KunTooltip>
        </template>
        <KunStickerPanel
          :adapters="props.adapters"
          :locale="props.locale"
          @pick="insertPick"
        >
          <template #tabs="{ tabs, active, select }">
            <KunTab
              :model-value="active"
              :items="tabs.map((item) => ({ value: item.id, textValue: item.label }))"
              variant="underlined"
              color="primary"
              :full-width="true"
              class="px-2 pt-1"
              @update:model-value="(value: string | number) => select(String(value))"
            />
          </template>
        </KunStickerPanel>
      </KunPopover>

      <KunPopover
        v-else-if="item.kind === 'entityPicker'"
        :ref="setEntityPopover"
        position="bottom-start"
        :opaque="true"
        inner-class="w-80 max-w-[calc(100vw-1rem)] p-2"
      >
        <template #trigger>
          <KunTooltip :text="chrome.entityPicker.label" :delay-show="300">
            <KunButton
              variant="light"
              size="sm"
              :is-icon-only="true"
              :aria-label="chrome.entityPicker.label"
            >
              <KunIcon :name="chrome.entityPicker.icon" />
            </KunButton>
          </KunTooltip>
        </template>
        <KunEntityTypePicker
          v-if="props.adapters.entityPrompt"
          :types="props.adapters.entityTypes ?? []"
          :locale="props.locale"
          @pick="pickEntityType"
          @close="closeEntityPopover"
        />
        <KunEntityPicker
          v-else
          :adapters="props.adapters"
          :locale="props.locale"
          @pick="pickEntity"
          @close="closeEntityPopover"
        />
      </KunPopover>

      <KunTooltip
        v-else-if="item.kind === 'button'"
        :text="item.tool.title"
        :delay-show="300"
      >
        <KunButton
          :variant="
            item.tool.mark && props.activeMarks[item.tool.mark]
              ? 'flat'
              : 'light'
          "
          :color="
            item.tool.mark && props.activeMarks[item.tool.mark]
              ? 'primary'
              : 'default'
          "
          size="sm"
          :is-icon-only="true"
          :aria-label="item.tool.title"
          :aria-pressed="item.tool.mark ? props.activeMarks[item.tool.mark] : undefined"
          @click="item.tool.run()"
        >
          <KunIcon :name="item.tool.icon" />
        </KunButton>
      </KunTooltip>
    </template>
  </div>
</template>
