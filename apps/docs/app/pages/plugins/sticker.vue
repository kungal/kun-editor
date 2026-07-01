<script setup lang="ts">
const src = `const adapters = {
  // 返回贴纸包;每张贴纸插入为一个 image 节点
  stickerSource: () => [
    { name: '默认', stickers: [{ src: '/s/1.webp', name: 'smile' }] }
  ]
}`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">要点</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li>工具栏最右的弹层,由 <code>features.sticker</code> 控制(默认开)。</li>
      <li><strong>表情标签页</strong>内置一套精选 unicode emoji,插入为纯文本 —— 无需 adapter。</li>
      <li><strong>贴纸标签页</strong>仅在提供 <code>stickerSource</code> 时出现;贴纸插入为 image 节点(所以无图编辑器只有 emoji)。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">贴纸来源</h2>
    <Code :code="src" lang="ts" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <p class="text-default-600 mb-3">点工具栏最右的表情按钮,切换「表情 / 贴纸」标签页:</p>
    <DemoEditor
      model-value="点右边的笑脸,插入 emoji 或贴纸 —— "
      :adapters="{ stickerSource: mockStickerSource }"
    />
  </article>
</template>
