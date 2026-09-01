---
'@kungal/editor-core': patch
'@kungal/editor-vue': patch
'@kungal/editor-nuxt': patch
---

KunUI 工具栏的链接面板不再抢着聚焦,页面不会被弹到顶部

下游报的两个 bug:①滚到页面中部点「链接」,整页跳回顶部;②编辑器放进 `KunModal` /
`KunDrawer` 时,链接面板里的输入框一个字都打不进去。

两个都属实,但根因都在 KunUI 侧,且 `@kungal/ui-vue` **2.26.0 已经全部修好**(库里每一处
主动 `focus()` 都带 `preventScroll`;浮层面板会登记进开它的那个弹窗的焦点陷阱)。

这里只做一件事:**把工具栏链接面板上那个多余的 `:autofocus="true"` 删掉。**
`KunPopover` 打开时本来就会带着 `preventScroll` 聚焦面板里第一个可聚焦元素 ——
输入框自己的挂载聚焦比它早一拍,发生在 floating-ui 量出位置**之前**,此时 teleport 到
`<body>` 的面板还停在文档原点(实测 `getBoundingClientRect().top === -1440`),
浏览器「滚动到该元素」就把整页拉回了顶部。这个 prop 从来没做过 popover 没做对的事,
删掉之后即使宿主的 KunUI 还没升到 2.26.0,也不会再跳顶。

第二个问题(弹窗里的焦点陷阱)编辑器这一侧无解 —— 面板是 KunUI teleport 的,陷阱也是
KunUI 建的。**编辑器放进 `KunModal` / `KunDrawer`,请把 `@kungal/ui-vue` 升到 2.26.0 及以上**,
这一点已写进 `@kungal/editor-nuxt` 的 README 与文档的「Nuxt 接入」页(那页还加了一个
「弹窗里的编辑器」实测 demo)。

无破坏性变更:面板照样自动聚焦,行为不变。
