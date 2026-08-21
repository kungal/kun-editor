// Link URL normalization — the ONE place a typed URL becomes a real URL.
//
// `www.kungal.com/topic/1` is not a URL: with no scheme the browser resolves it
// against the current page, so the link silently lands on
// `<origin>/<current/path>/www.kungal.com/topic/1` — dead, and dead in a way the
// author cannot see while writing. Every link entry point (the selection
// bubble's input, the headless toolbar's panel, the KunUI popover, and a host's
// own `linkPrompt`) dispatches `insertLinkCommand`, so normalizing inside that
// command covers all of them at once — a host must never re-implement this.
//
// It lives in the LIGHT entry (pure string work, zero deps) so a server can
// import it too, e.g. to normalize legacy content on the way in.

/**
 * A `scheme:` prefix. RFC 3986 allows `.` in a scheme; this deliberately does
 * NOT, so `www.kungal.com:8080/x` reads as host:port instead of as a scheme.
 * (`localhost:3000` still reads as a scheme — genuinely ambiguous, left alone.)
 */
const HAS_SCHEME = /^[a-z][a-z0-9+-]*:/i

/**
 * Deliberately relative, so it must survive untouched: `/abs`, `?q`, `#anchor`,
 * `./rel`, `../up`, and protocol-relative `//host` (already valid in a browser).
 * This is also the escape hatch — write `./readme.md` for a relative file.
 */
const IS_RELATIVE = /^[/?#.]/

/** A plain email address. `https://` would read it as userinfo and go nowhere. */
const IS_EMAIL = /^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i

/** Starts with a hostname: a dotted label plus an alphabetic TLD, then end or
 * one of `/ ? # :`. Excludes `@` so a userinfo URL is never invented. */
const STARTS_WITH_HOST = /^[^\s/?#@]+\.[a-z]{2,}(?=$|[/?#:])/i

/** A bare IPv4 host (`10.0.0.5:8080/x`) — dotted, but it has no TLD to match. */
const STARTS_WITH_IPV4 = /^\d{1,3}(\.\d{1,3}){3}(?=$|[/?#:])/

/**
 * Give a user-typed link URL a scheme, so it points where the author meant.
 *
 * - `www.kungal.com/topic/1` → `https://www.kungal.com/topic/1` (https, not
 *   http: an http-only site redirects, an https-only site does not).
 * - `me@kungal.com` → `mailto:me@kungal.com`.
 * - Anything already carrying a scheme is returned as typed — including
 *   `kungal-user:` / `kungal-reply:` (see MENTION_SCHEME, QUOTE_SCHEME).
 * - Anything explicitly relative (`/x`, `./x`, `#x`, `?x`, `//host`) is left
 *   alone, as is anything that doesn't look like a host at all (`draft`).
 *
 * The one ambiguous input is a lone dotted word: `readme.md` looks exactly like
 * a hostname (`.md` IS a TLD), so it gets `https://`. Write `./readme.md` when
 * a relative file is what you mean.
 */
export const normalizeLinkHref = (input: string): string => {
  const href = input.trim()
  if (!href || HAS_SCHEME.test(href) || IS_RELATIVE.test(href)) {
    return href
  }
  if (IS_EMAIL.test(href)) {
    return `mailto:${href}`
  }
  if (STARTS_WITH_HOST.test(href) || STARTS_WITH_IPV4.test(href)) {
    return `https://${href}`
  }
  return href
}
