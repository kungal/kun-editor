---
'@kungal/editor-core': minor
'@kungal/editor-nuxt': minor
'@kungal/editor-vue': minor
---

隐藏文本:选区里的换行不再写出读不回来的 markdown,选区气泡里也有了这颗按钮

- **`insertKunSpoilerCommand` 把选区里的换行折成空格。** `||…||` 在每一个读它的地方
  都只在同一行内配对(这里的 remark 转换、共用同一语法的服务端渲染器),而 commonmark 的
  hardbreak 声明了 `leafText: () => '\n'` —— 所以选中跨行的文字点「隐藏文本」,按钮会写出
  `||第一行\n第二行||`:一段它自己都读不回来、渲染出来是两条光秃秃竖线的 markdown。现在
  `textBetween` 的**两个**分隔符都给 `' '`(块级的本来就是),跨行选区并成一个单行 spoiler。
- **选区里一个字都没有时返回 `false`**,而不是把选中的东西替换掉 —— 单独选中一张图片点
  「隐藏文本」不再删图。(选中的是节点、或在代码块里,原本就已经返回 `false`。)
- **选区气泡工具栏加入 `spoiler`**:`KunSelectionItem` 多一个成员,默认那一排变成
  `bold / italic / strike / code / spoiler / link`。按下态走已有的 `activeMarks.spoiler`,
  光标在 spoiler 里时按钮点亮、点一下揭示,和固定工具栏完全一致。
- 顺手把气泡默认按钮表收成**一份** `DEFAULT_SELECTION_ITEMS`(`context.ts`)。原本
  `<KunEditor>` 和气泡各存一份,只改气泡那份等于没改 —— 真实编辑器读的是 context 那份。

**跨行剧透不在此列**:`||…||` 是行内语法(schema `inline: true`,mdast 里开闭两个 `||`
根本落在不同的 text 节点上),要藏整段多行内容需要的是一个块级容器语法,得全生态(渲染器
先行)另行约定,不是把 `||…||` 拉长。
