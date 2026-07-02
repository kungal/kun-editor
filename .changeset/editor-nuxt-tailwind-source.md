---
'@kungal/editor-nuxt': minor
---

Ship `tailwind.css` so the KunUI toolbar/picker/tabs styles render drop-in.

`<KunEditorToolbar>` / `<KunEditorViewSwitch>` use Tailwind utility classes
(grids, aspect, sizes, dividers, menu items). Tailwind v4 doesn't scan
`node_modules`, so without registration the sticker/emoji grid collapsed (huge
stickers). The package now ships `tailwind.css` containing a path-relative
`@source "./runtime"` — the Tailwind-team-recommended pattern for a
Tailwind-based library, and pnpm-layout-safe (resolved relative to the file, not
the app's `node_modules`). Consumers add one line to their Tailwind entry:

```css
@import '@kungal/ui-vue/style.css';
@import '@kungal/editor-nuxt/tailwind.css';
```
