<script setup lang="ts">
const wire = `const adapters = {
  uploadImage: async (file) => {
    const form = new FormData()
    form.append('image', file)
    return await api.post<string>('/image/topic', form) // → URL
  }
}`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">接线</h2>
    <Code :code="wire" lang="ts" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">要点</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li><strong>由 adapter 门控</strong>:有 <code>uploadImage</code> 才会有工具栏图片按钮、粘贴 / 拖拽上传。</li>
      <li>逐张上传;失败的那张会被跳过并通过 <code>notify</code> 提示,而不是整批中断。</li>
      <li>缺 <code>uploadImage</code> = 无图编辑器(见<NuxtLink class="text-primary" to="/guide/adapters">适配器指南</NuxtLink>)。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <p class="text-default-600 mb-3">
      点工具栏最右的图片按钮选一张图(mock 会读成 data URL 直接嵌入),或直接粘贴 / 拖拽。
    </p>
    <DemoEditor
      model-value="试试上传一张图片 —— "
      :adapters="{ uploadImage: mockUploadImage, notify: mockNotify }"
    />
  </article>
</template>
