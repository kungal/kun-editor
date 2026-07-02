<script setup lang="ts">
const extend = `// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@kungal/ui-nuxt', '@kungal/editor-nuxt']
})`

const use = `<!-- 任意组件里 —— 无需 import,<KunEditor> 已自动注册 -->
<template>
  <KunEditor v-model="markdown" :adapters="adapters" />
</template>`

const css = `/* app 的 main.css */
@import '@kungal/ui-tokens';
@import '@kungal/ui-vue/style.css';
@import './kun-editor.css';   /* 编辑器参考样式 */`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">扩展 Nuxt 层</h2>
    <p class="text-default-600 mb-3">
      <code class="text-primary">@kungal/editor-nuxt</code> 是一个薄薄的 Nuxt
      层,自动导入 <code>&lt;KunEditor&gt;</code>。把它加进
      <code>extends</code> 即可:
    </p>
    <Code :code="extend" lang="ts" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">直接用</h2>
    <p class="text-default-600 mb-3">
      之后在任意组件里无需 import(<code>&lt;KunEditor&gt;</code> 与 KunUI 版
      <code>&lt;KunEditorToolbar&gt;</code> / <code>&lt;KunEditorViewSwitch&gt;</code>
      都已自动注册):
    </p>
    <Code :code="use" lang="vue" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">dev 依赖优化(自动)</h2>
    <p class="text-default-600 mb-3">
      在 <code>nuxt dev</code> 下,Milkdown 的分词器(micromark)会走 dev 构建、
      <code>import debug from 'debug'</code>,而 <code>debug</code> 是 CommonJS ——
      若 Vite 没预打包它,编辑器会在加载时抛
      <code>'debug' does not provide an export named 'default'</code>。
      <strong>这一层已经替你配好</strong> Vite 的 <code>optimizeDeps.include</code>
      (预打包编辑器/Milkdown 子图,把 <code>debug</code> 的 CJS 解决在包内),
      所以你<strong>无需在自己的 <code>nuxt.config</code> 里配任何东西</strong>。生产构建不受影响。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">样式</h2>
    <p class="text-default-600 mb-3">
      编辑器仍是 headless 的 —— 在你的 CSS 入口引入参考样式(以及启用的 peer
      的 CSS)。详见<NuxtLink class="text-primary" to="/guide/styling">样式指南</NuxtLink>。
    </p>
    <Code :code="css" lang="css" />

    <p class="text-default-500 mt-6 text-sm">
      别忘了 Milkdown 全家桶与可选 peer 仍需在宿主里安装一次 —— 见<NuxtLink
        class="text-primary"
        to="/getting-started"
        >快速开始</NuxtLink
      >。
    </p>
  </article>
</template>
