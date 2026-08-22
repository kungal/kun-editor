---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

隐藏文本:编辑时看得出被隐藏,光标锚点不再进入存库的 markdown

- **剧透块的底色不再依赖宿主 token。** 原来是 `background: var(--color-default-500)`,
  没有 fallback —— 宿主没定义这个调色板变量时整条声明作废,实测算出来是
  `rgba(0, 0, 0, 0)`:编辑时剧透块和正文长得一模一样。而「零 CSS 的 headless 编辑器」
  正是这样的宿主。现在自带一份不依赖任何设计 token 的默认底色(由 `currentColor`
  混出,明暗主题都成立),并留出 `--kun-spoiler-bg` 这个换肤钩子 —— 内联样式压得过
  任何选择器,但压不过自定义属性,所以这是宿主唯一能用纯 CSS 改它的入口。
  `@kungal/editor-nuxt/editor.css` 把它映射成 `--color-default-200`,KunUI 宿主观感不变。
- **光标锚点(`U+200B`)只留在编辑器文档里,不再写进 markdown。** 锚点是编辑器的
  内部装置(光标必须落在某个 text 节点上),但它一直跟着正文一起被序列化出去,存库的
  文本会变成 `鲲 ||Galgame||<U+200B> 论坛` —— 数据库、diff、以及每一个不认识本编辑器的
  下游都得吃下这个看不见的字符。现在在 **serializer** 这一层统一剥掉:`getMarkdown()`、
  `v-model`、源码视图、宿主自己的 action 都读同一个 slice,所以一处收口全部干净;
  从旧内容或粘贴带进来的锚点也一并清掉 —— **旧帖打开再保存一次就自愈**。
  解析时反过来给每个 `||…||` 补回锚点,所以「点在段尾的剧透块后面接着打字,字落在
  块外面」这件事和以前一样成立。

对下游没有破坏性改动:markdown 少了一个不可见字符,DOM 结构与命令行为不变。
