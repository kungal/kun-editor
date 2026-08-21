---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

fix(link): give a typed URL the scheme it needs, in ONE place

Typing `www.kungal.com/topic/1` into any link input produced a **relative**
href: with no scheme the browser resolves it against the current page, so the
link went to `<origin>/<current/path>/www.kungal.com/topic/1` — dead, and dead
in a way the author can't see while writing.

`insertLinkCommand` now normalizes its `href`, and since every link entry point
(the selection bubble's input, the headless toolbar's URL panel, the KunUI
toolbar's popover, and a host's own `linkPrompt` adapter) dispatches that one
command, all of them are fixed at once — a host must not re-implement this.

- `www.kungal.com/topic/1` → `https://www.kungal.com/topic/1` (https, not http:
  an http-only site redirects, an https-only site doesn't). Ports, queries,
  fragments and bare IPv4 hosts included.
- `me@kungal.com` → `mailto:me@kungal.com` (`https://` would read the address as
  userinfo and go nowhere).
- Untouched: anything with a scheme — `kungal-user:` / `kungal-reply:` included
  — and anything explicitly relative (`/x`, `./x`, `../x`, `#x`, `?x`, `//host`).
- The one ambiguous input is a lone dotted word: `readme.md` looks exactly like
  a hostname (`.md` is a TLD), so it gets `https://`. Write `./readme.md` when a
  relative file is what you mean.

The rule is also exported as `normalizeLinkHref(input)` from the light,
zero-dependency `@kungal/editor-core` entry, so a server can normalize legacy
content with the exact same logic.

Along with it, the three URL inputs move from `type="url"` to `type="text"` +
`inputmode="url"`. Native URL validation rejects exactly the schemeless input
this change exists to accept — in the KunUI toolbar's popover, which submits a
real `<form>`, pressing Enter on `www.kungal.com/topic/1` did nothing at all.
The mobile keyboard hint is kept.
