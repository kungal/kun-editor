<script setup lang="ts">
const wire = `import type { KunEditorAdapters } from '@kungal/editor-core'

const adapters: KunEditorAdapters = {
  // 上传一张图片,返回要嵌入的 URL(工具栏 / 粘贴 / 拖拽都会调)
  uploadImage: async (file) => {
    const form = new FormData()
    form.append('image', file)
    return await api.post<string>('/image/topic', form)
  },
  // 解析 @提及 查询(内部已做防抖)
  searchMentionUsers: (q) => oauth.searchUsers(q), // → { id, name, avatar? }[]
  // 贴纸包(省略则隐藏贴纸标签页)
  stickerSource: () => stickerStore.packs,
  // 把编辑器通知接到你的 toast
  notify: (message, level) => toast[level](message)
}`

const rows = [
  { name: 'uploadImage', type: '(file: File) => Promise<string>', description: '上传一张图片,resolve 要嵌入的 URL。缺席 = 无图编辑器(上传/粘贴/拖拽/贴纸全部消失)。' },
  { name: 'searchMentionUsers', type: '(q: string) => Promise<MentionUser[]>', description: '解析 @提及 查询。缺席则 @ 下拉不出现(但 mention schema 仍随 features.mention 保留往返)。' },
  { name: 'stickerSource', type: '() => StickerPack[] | Promise<…>', description: '提供贴纸包。缺席则贴纸标签页隐藏(emoji 仍在)。' },
  { name: 'notify', type: '(msg: string, level: NotifyLevel) => void', description: '把编辑器通知(如「上传失败」)路由到你的 toast 系统。' }
]
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">机制 vs 策略</h2>
    <p class="text-default-600">
      编辑器拥有<strong>机制</strong>(节点 / 输入规则 / 快捷键 / markdown
      解析序列化 / 插件装配);宿主注入<strong>策略</strong>(上传去哪、@mention
      怎么解析、有哪些贴纸、通知怎么弹)。策略就是这一小撮
      adapter,<strong>全部可选</strong> —— 缺哪个,对应插件就不装配。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">接线</h2>
    <Code :code="wire" lang="ts" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">适配器一览</h2>
    <PropsTable head="adapter" :rows="rows" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">试一试</h2>
    <p class="text-default-600 mb-3">
      下面这个编辑器接入了全部 mock adapter:输入 <code>@</code> 触发提及,
      工具栏可上传图片、插入贴纸。
    </p>
    <DemoEditor
      model-value="接入了全部 adapter —— 试试 @Alice、上传图片、插入贴纸 🎉"
      :adapters="{ searchMentionUsers: mockSearchMentionUsers, stickerSource: mockStickerSource, uploadImage: mockUploadImage, notify: mockNotify }"
    />

    <h2 class="mt-8 mb-1 text-xl font-semibold">无图编辑器</h2>
    <p class="text-default-600 mb-3">
      想要一个「纯文本 + 无图」的编辑器(比如 galgame
      简介)?不用什么 <code>disableImage</code> 开关 —— 直接
      <strong>不传 <code>uploadImage</code></strong>,上传按钮、粘贴/拖拽、贴纸就都消失了。
    </p>
    <DemoEditor
      model-value="没有 uploadImage 适配器 —— 工具栏没有图片按钮,贴纸也没了。"
      :adapters="{}"
    />
  </article>
</template>
