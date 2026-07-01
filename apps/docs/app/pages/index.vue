<script setup lang="ts">
const features = [
  {
    icon: 'lucide:brain',
    title: '一个编辑器大脑',
    body: '框架无关的 Milkdown 插件内核(spoiler / katex / 代码块 / @mention / 上传 / 贴纸),生态里所有 app 共用一套,不再各自复制。'
  },
  {
    icon: 'lucide:plug',
    title: '机制 vs 策略',
    body: '编辑器出机制,宿主注入策略:上传去哪、@mention 怎么解析、有哪些贴纸,都是可选 adapter。缺哪个,对应功能自动关闭。'
  },
  {
    icon: 'lucide:palette',
    title: 'Headless,零样式',
    body: 'editor-vue 不带任何 CSS,只暴露稳定的 class 钩子。样式完全交给下游 —— 本站的 playground 就是一份 KunUI 主题的参考实现。'
  },
  {
    icon: 'lucide:columns-2',
    title: '双视图',
    body: '所见即所得 + CodeMirror Markdown 源码,共享一个 v-model,随时切换。'
  }
]
</script>

<template>
  <div class="mx-auto max-w-5xl px-5">
    <!-- Hero -->
    <section class="py-16 text-center sm:py-24">
      <div
        class="text-primary bg-primary-100 mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
      >
        <KunIcon name="lucide:sparkles" />
        Milkdown · headless · KUN Galgame
      </div>
      <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">KunEditor</h1>
      <p class="text-default-600 mx-auto mt-4 max-w-2xl text-lg">
        一个基于 Milkdown 的 Markdown 编辑器,为 KUN Galgame 生态而生 ——
        框架无关的插件内核 + 薄薄的 Vue 渲染层,一套大脑,处处复用。
      </p>
      <div class="mt-8 flex items-center justify-center gap-3">
        <KunButton color="primary" href="/playground">
          打开 Playground
        </KunButton>
        <KunButton
          variant="bordered"
          href="https://github.com/kungal/kun-editor"
          target="_blank"
        >
          GitHub ↗
        </KunButton>
      </div>
    </section>

    <!-- Features -->
    <section class="grid gap-4 pb-16 sm:grid-cols-2">
      <KunCard v-for="f in features" :key="f.title" class-name="h-full">
        <div class="flex items-start gap-3">
          <div
            class="bg-primary-100 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg text-xl"
          >
            <KunIcon :name="f.icon" />
          </div>
          <div>
            <h3 class="font-semibold">{{ f.title }}</h3>
            <p class="text-default-600 mt-1 text-sm leading-relaxed">
              {{ f.body }}
            </p>
          </div>
        </div>
      </KunCard>
    </section>

    <!-- Install -->
    <section class="pb-24">
      <h2 class="mb-3 text-xl font-semibold">安装</h2>
      <KunCard class-name="overflow-x-auto">
        <pre
          class="text-sm leading-relaxed"
        ><code>pnpm add @kungal/editor-vue @kungal/editor-core \
  @milkdown/kit @milkdown/prose @milkdown/vue vue</code></pre>
      </KunCard>
      <p class="text-default-500 mt-3 text-sm">
        editor-vue 是 headless 的 —— 复制本站的
        <code class="text-primary">kun-editor.css</code>
        参考样式(或自己写)来给它上妆。可选功能(katex / 代码块)按需再装它们的
        peer。
      </p>
    </section>
  </div>
</template>
