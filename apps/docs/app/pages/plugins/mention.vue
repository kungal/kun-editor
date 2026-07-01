<script setup lang="ts">
const md = `markdown 形式(与服务端共用):

[@Alice](kungal-user:1)`

// The mention link form is host policy — override per site, zero data migration.
const custom = `const adapters = {
  // 默认是 kungal-user:<id>;换成你服务端的形态(如 moyu 的真实链接)
  mentionToUrl: (id) => \`/user/\${id}/resource\`,
  mentionFromUrl: (url) => {
    const m = url.match(/^\\/user\\/(\\d+)/)
    return m ? Number(m[1]) : null
  }
}`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">语法</h2>
    <Code :code="md" lang="markdown" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">要点</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li>schema 是纯的,保证 <code>[@name](kungal-user:id)</code> 往返;由 <code>features.mention</code> 控制(默认开)。</li>
      <li><code>@</code> 自动补全下拉消费 <code>searchMentionUsers</code> 适配器 —— 缺它则无下拉。</li>
      <li>默认 scheme 常量 <code>MENTION_SCHEME = 'kungal-user:'</code> 与服务端共享。</li>
      <li>链接形态是<strong>宿主策略</strong>,可用 <code>mentionToUrl</code> / <code>mentionFromUrl</code> 覆盖(见下)。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">自定义链接形态(宿主策略)</h2>
    <p class="text-default-600 mb-3">
      @提及 的 URL 形态是每个站的服务端契约,所以是可注入的策略。默认
      <code>kungal-user:&lt;id&gt;</code>;宿主(如 moyu 用真实链接
      <code>/user/&lt;id&gt;/resource</code>)覆盖即可 —— <strong>零数据迁移、后端不动</strong>。
    </p>
    <Code :code="custom" lang="ts" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <p class="text-default-600 mb-3">输入 <code>@a</code> 触发下拉(Alice / Alicia):</p>
    <DemoEditor
      model-value="输入 @a 试试提及自动补全 —— "
      :adapters="{ searchMentionUsers: mockSearchMentionUsers }"
    />
  </article>
</template>
