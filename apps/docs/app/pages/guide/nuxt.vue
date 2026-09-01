<script setup lang="ts">
const extend = `// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@kungal/ui-nuxt', '@kungal/editor-nuxt']
})`

const use = `<!-- 任意组件里 —— 无需 import,<KunEditor> 已自动注册 -->
<template>
  <KunEditor v-model="markdown" :adapters="adapters" />
</template>`

// The in-modal demo below: the editor's toolbar popovers are teleported to
// <body>, so this is the case that only works from @kungal/ui-vue 2.26.0 on.
const modalOpen = ref(false)

const css = `/* app 的 main.css */
@import '@kungal/ui-tokens';
@import '@kungal/ui-vue/style.css';
@import '@kungal/editor-nuxt/editor.css';   /* 编辑器参考样式 */`
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

    <h2 class="mt-8 mb-1 text-xl font-semibold">放进 KunModal / KunDrawer</h2>
    <p class="text-default-600 mb-3">
      编辑器本身可以直接放进弹窗/抽屉,但请把 <code>@kungal/ui-vue</code> 升到
      <strong>2.26.0 及以上</strong>。工具栏的链接、表情面板是
      <code>KunPopover</code>,面板会 teleport 到
      <code>&lt;body&gt;</code>;而 <code>KunModal</code> /
      <code>KunDrawer</code> 的焦点陷阱是以自己那棵 DOM 子树为界建立的 ——
      2.26.0 之前的陷阱不认这些面板,焦点一进去就被拽回触发按钮,面板里的输入框
      <strong>一个字都打不进去</strong>。2.26.0 起浮层会登记到「开它的那个弹窗」里,
      陷阱照样是陷阱,面板也能用了。编辑器这一侧无需任何配置。
    </p>
    <p class="text-default-600 mb-3">
      下面就是这个场景 —— 打开弹窗,点工具栏的链接按钮,URL 输入框应当拿到焦点、能打字:
    </p>
    <KunButton variant="flat" color="primary" @click="modalOpen = true">
      打开一个装着编辑器的弹窗
    </KunButton>
    <KunModal v-model="modalOpen" title="弹窗里的编辑器" size="lg">
      <DemoEditor
        model-value="点工具栏的链接按钮试试。"
        :kunui-toolbar="true"
        :output="false"
      />
    </KunModal>

    <p class="text-default-600 mt-3 mb-3">
      同源的另一半(滚到页面中部点开链接面板会跳回顶部)在编辑器这一侧也修掉了:
      面板里的输入框不再自带 <code>autofocus</code> —— <code>KunPopover</code>
      本来就会带着 <code>preventScroll</code> 聚焦面板里第一个可聚焦元素,
      多出来的那次聚焦发生在 floating-ui 量出位置<strong>之前</strong>,
      浏览器于是「滚动到」还停在文档原点的面板。
    </p>

    <p class="text-default-500 mt-6 text-sm">
      别忘了 Milkdown 全家桶与可选 peer 仍需在宿主里安装一次 —— 见<NuxtLink
        class="text-primary"
        to="/getting-started"
        >快速开始</NuxtLink
      >。
    </p>
  </article>
</template>
