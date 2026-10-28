---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

统一的链接编辑器:「文本」+「链接」两栏,所有入口同一个组件

**一个编辑器,所有入口:** 选区气泡的链接按钮、手搓工具栏的链接按钮、KunUI 工具栏的链接按钮(KunPopover 里)、Ctrl+K / ⌘K、以及光标落在已有链接里,打开的都是同一个 `KunLinkEditor`(新导出),生成 `[文本](链接)`。在气泡里它就地替换按钮行:左边缘保持不动、向右上展开到 17rem,不会横向跳动。

- 有选区:「文本」预填选中的文字,改它就替换选中的文字;文字不变时只加链接,原有的混合格式保留。
- 无选区:两栏为空;剪贴板里是一个 URL 且**无需弹权限**就能读到时(Permissions API 已为 granted),预填「链接」;否则静默跳过。提交时「文本」为空则用 URL 作文本。
- 编辑已有链接:两栏从链接预填,另有「移除链接」与「打开」(新标签页)。光标落在链接文字里时编辑器直接显示,但不抢焦点(点击链接仍是放光标);点进输入框才开始编辑。Ctrl+K 在链接边缘时也编辑该链接。
- 选区跨段落或包含非文本内容(行内引用、图片、行内公式)时「文本」只读,链接照常加在原内容上。
- Enter 在任一栏提交(输入法组字中的 Enter 不提交),Esc 取消,Tab 切换;焦点落在第一个空栏(都不空则「链接」)。链接为空时拒绝提交并标记该栏。
- URL 照旧经 `normalizeLinkHref` 归一化。「文本」等于 URL 且 URL 是实体时,结果是裸链接,按实体规则变成卡片 / 行内。
- 每次应用是一个撤销步。手机上两栏纵向排列、输入框 16px(避免 iOS 聚焦缩放);编辑器自己的浮层按 visualViewport 保持在屏幕键盘之上。
- 编辑器获得焦点时由它处理 Ctrl+K 并阻止冒泡,宿主的全站 Ctrl+K(如搜索面板)不会同时触发。

**核心:** 新增 `setLinkCommand({ text?, href })`、`removeLinkCommand()`、`linkDraft(state)`、`linkAtSelection(state, strict?)`。**工具栏 API:** 新增 `getLinkDraft()`、`applyLink({ text?, href })`、`unlink()`。**`linkPrompt` 适配器:** 仍然有效,拿到 `{ text }`,可返回 URL 字符串(文本不变)或 `{ text, href }`;另导出 `askLinkPrompt` 供自定义工具栏使用。参考样式表的 `.kun-editor__link-input` 换成 `.kun-link-editor*`。
