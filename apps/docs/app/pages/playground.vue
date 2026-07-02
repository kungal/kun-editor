<script setup lang="ts">
import { computed, ref } from 'vue'
import { KunEditor } from '@kungal/editor-vue'
import type { KunEditorAdapters, KunEditorLocale } from '@kungal/editor-core'
import type { KunSelectOption } from '@kungal/ui-vue'

const markdown = ref(
  [
    '# 试试 KunEditor',
    '',
    '**加粗**、*斜体*、`行内代码`,还有 ||隐藏文本|| 与行内公式 $E = mc^2$。',
    '',
    '- 输入 `@` 触发 @提及下拉',
    '- 工具栏最右是表情 / 贴纸',
    '- 切到 Markdown 页签看源码'
  ].join('\n')
)

// ── Toggles (dogfooding KunSwitch) ──────────────────────────────────────────
const enableMention = ref(true)
const enableSticker = ref(true)
const enableUpload = ref(true)
const readonly = ref(false)
const locale = ref<KunEditorLocale>('zh-cn')

const localeOptions: KunSelectOption[] = [
  { value: 'zh-cn', label: '简体中文' },
  { value: 'en-us', label: 'English' }
]

// ── Mock host policy (the adapters a real app would wire) ───────────────────
const searchMentionUsers: NonNullable<
  KunEditorAdapters['searchMentionUsers']
> = async (q) => {
  const all = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Alicia' },
    { id: 3, name: 'Bob' },
    { id: 42, name: 'Kun' }
  ]
  return all.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()))
}

const dot = (color: string) =>
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><circle cx='32' cy='32' r='28' fill='${color}'/></svg>`
const stickerSource: NonNullable<KunEditorAdapters['stickerSource']> = () => [
  {
    name: 'Demo',
    stickers: [
      { src: dot('%23f43f5e'), name: 'red' },
      { src: dot('%233b82f6'), name: 'blue' },
      { src: dot('%2322c55e'), name: 'green' },
      { src: dot('%23eab308'), name: 'yellow' },
      { src: dot('%23a855f7'), name: 'purple' }
    ]
  }
]

// Reads the picked file as a data URL — a real host would POST it and return a URL.
const uploadImage: NonNullable<KunEditorAdapters['uploadImage']> = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })

const notice = ref('')
const notify: NonNullable<KunEditorAdapters['notify']> = (msg) => {
  notice.value = msg
  window.setTimeout(() => (notice.value = ''), 2500)
}

const adapters = computed<KunEditorAdapters>(() => ({
  notify,
  ...(enableMention.value ? { searchMentionUsers } : {}),
  ...(enableSticker.value ? { stickerSource } : {}),
  ...(enableUpload.value ? { uploadImage } : {})
}))

const features = computed(() => ({
  mention: enableMention.value,
  sticker: enableSticker.value
}))

// The editor reads adapters/features once at build time, so remount it when the
// config changes (v-model persists — the content survives).
const editorKey = computed(() =>
  JSON.stringify({
    m: enableMention.value,
    s: enableSticker.value,
    u: enableUpload.value,
    r: readonly.value,
    l: locale.value
  })
)
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 py-10">
    <h1 class="text-2xl font-bold">Playground</h1>
    <p class="text-default-600 mt-1">
      一个用 KunUI 主题化的 <code class="text-primary">&lt;KunEditor&gt;</code>。
      拨动开关看 adapter 如何点亮功能。
    </p>

    <div class="mt-6 grid gap-5 lg:grid-cols-[1fr_16rem]">
      <!-- Editor + output -->
      <div class="min-w-0 space-y-5">
        <KunCard>
          <KunEditor
            :key="editorKey"
            v-model="markdown"
            :adapters="adapters"
            :features="features"
            :locale="locale"
            :readonly="readonly"
            placeholder="写点什么…(清空内容看看 placeholder)"
          />
        </KunCard>

        <div>
          <div class="mb-2 flex items-center gap-2">
            <KunChip color="success">
              <KunIcon name="simple-icons:markdown" />
              v-model
            </KunChip>
            <span class="text-default-500 text-sm">{{ markdown.length }} chars</span>
          </div>
          <KunCard class-name="overflow-x-auto">
            <pre class="text-sm leading-relaxed whitespace-pre-wrap">{{ markdown }}</pre>
          </KunCard>
        </div>
      </div>

      <!-- Controls -->
      <aside class="space-y-4">
        <KunCard>
          <h2 class="mb-3 text-sm font-semibold">Adapters / 功能</h2>
          <div class="flex flex-col gap-3">
            <KunSwitch v-model="enableUpload" label="uploadImage(图片上传)" />
            <KunSwitch v-model="enableMention" label="searchMentionUsers(@提及)" />
            <KunSwitch v-model="enableSticker" label="stickerSource(贴纸)" />
            <KunSwitch v-model="readonly" label="只读" />
          </div>
        </KunCard>

        <KunCard>
          <KunSelect v-model="locale" :options="localeOptions" label="locale" />
        </KunCard>

        <p class="text-default-500 text-xs leading-relaxed">
          关掉一个 adapter,对应的按钮/下拉会消失(缺 adapter = 关功能)。
          @提及的 schema 仍随 <code>features.mention</code> 保留往返。
        </p>
      </aside>
    </div>

    <!-- notify() surface -->
    <transition name="fade">
      <div
        v-if="notice"
        class="bg-danger text-danger-foreground fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg"
      >
        {{ notice }}
      </div>
    </transition>
  </div>
</template>
