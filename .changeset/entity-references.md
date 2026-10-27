---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

实体引用:话题 / Galgame / 资源 / 用户等站内实体显示为块级卡片或行内引用,存储形式仍是裸的规范 URL

**markdown 契约(与服务端共用,存储格式不变):** 规范 URL 本身就是引用。链接只有在「裸」的时候才是实体链接 —— 文本等于 href(`<https://…>`、GFM 字面量 `https://…`、`[u](u)`)且宿主的 `entityFromUrl(href)` 认得它。一个段落里(去掉纯空白文本)只有这一个链接 → **卡片**(引用块、列表项里同样成立,列表项第一个块也可以是卡片);其余位置 → **行内**(标题、表格单元格、`**<url>**` 都是行内)。代码、行内代码、`||隐藏文本||` 里永远不是。`[自定义文字](url)` 是普通链接,永不升级。两者都序列化回 `<规范 URL>`,所以 `https://kungal.com/topic/1/` 读入后保存为 `<https://www.kungal.com/topic/1>`。

**适配器(都在 `KunEditorAdapters`,全部可选):**

- `entityFromUrl(url) → { type, id, url } | null` —— 开关整个功能;`url` 返回规范的绝对 URL。抛错 / 返回畸形值视为「不是实体」。
- `searchEntities(type, query, signal)`、`entityTypes: { type, label, icon? }[]` —— 「/」菜单与工具栏选择器。
- `entityTitle(ref, signal) → string | null` —— 「转为链接」写入的标题。
- 新增 `features.entity`(默认开,缺 `entityFromUrl` 时无效)。

**渲染由宿主提供:** `<KunEditor :entity-view="{ card, chip }">`,两个组件都收到 `{ entity, selected }`,自己取预览并预留最终尺寸(编辑器不额外包会改变尺寸的东西,预览晚到不跳动)。不传时退化为显示 URL 的中性样式。编辑器内不跳转。参考样式表新增 `.kun-entity*`、`.kun-entity-menu*`、`.kun-entity-slash*`、`.kun-entity-picker*` 与 gap cursor 样式(遵守 `prefers-reduced-motion`)。

**一条规则,所有入口:**

- **粘贴**单个实体 URL:粘进空段落 → 卡片(光标落到其后一段),夹在文字中 → 行内。转换是**单独一个撤销步**:第一次 Ctrl+Z 变回**纯文本** URL(不是普通链接 —— 裸实体链接按契约就是行内,保存后会变回去),第二次撤掉粘贴;撤销过的 URL 之后接空格 / 回车不会再被转换。随后在节点旁出现 `卡片 / 行内 / 链接` 小气泡:不抢焦点、不截获回车,<kbd>Tab</kbd> 进入,←/→ 移动,回车应用,Esc 关闭,继续打字即消失。
- **自动链接**:手机键盘剪贴板条整条提交同粘贴;手打的 URL 按回车且独占一段 → 卡片,按空格 → 行内。输入法组字期间不转换。
- **「/」菜单**:段首或空白后输入 `/`,列出 `entityTypes`;继续输入过滤类型,选中后在文档里直接输入搜索词(防抖、可中止、过期结果丢弃,有加载 / 无结果状态),↑/↓/回车 选择;段落为空 → 卡片,否则行内。`role="listbox"` + 编辑器上的 `aria-activedescendant`。Esc 在搜索词为空时只删掉 `/`;空搜索词时退格回到类型列表。
- **程序化**:工具栏 API 与 ref 句柄新增 `insertEntity(ref, display?)`(`'card' | 'chip' | 'auto'`,默认 `auto`);`KunEditorToolbar` 新增 `entityPicker` 按钮(默认布局里排在图片后,缺适配器自动隐藏);选择器面板以 `KunEntityPicker` 导出,供自定义工具栏使用。
- **选中**卡片 / 行内(点击、轻触、方向键,卡片前后有 gap cursor):气泡 `卡片 / 行内 / 链接 / 删除`;回车在卡片后新开一段;选中时打字落在其后,不会覆盖;退格 / Delete 整块删除;复制的 text/plain 是 URL,text/html 带 data-* 属性,粘回来仍是同一个节点。「链接」写成 `[标题](url)`(标题来自 `entityTitle`,缺席 / 失败 / 超过 1.5 秒时用去掉 scheme 的 URL)。

**自动链接顺带修正:** 中文后面直接接网址(`看这个https://example.com/x` 再按空格)现在也会变成链接,和粘贴同一段文字时 GFM 的读法一致;只在网址前一个字符是非 ASCII(中文、全角标点)时生效,`x.https://a.com` 这类仍然不动。
