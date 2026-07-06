---
'@kungal/editor-nuxt': minor
---

`<KunEditorViewSwitch>` now forwards `variant` / `color` / `size` to its KunTab, so
the 预览 / Markdown / 分栏 switch can be restyled without rebuilding it:

```vue
<template #view-switch="s">
  <KunEditorViewSwitch v-bind="s" variant="solid" color="secondary" size="md" />
</template>
```

Defaults stay `underlined` / `primary` / `sm` (`size` also sizes the swap /
scroll-sync buttons). This is the middle of the three customization layers, now all
documented on the KunUI-toolbar example: (1) the default headless switch is styled
via the `.kun-editor__toolbar` / `.kun-editor__tab` (`[data-active]`) CSS hooks;
(2) `<KunEditorViewSwitch>` takes these appearance props; (3) the `#view-switch`
slot API lets you render a completely different control.

Verified in the docs production build: a `solid` / `secondary` / `md` switch
renders a bordered, taller tab group distinct from the default underlined one; 0
console errors.
