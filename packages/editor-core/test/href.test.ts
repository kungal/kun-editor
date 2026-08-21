// normalizeLinkHref — a typed URL gets the scheme the author meant. Without it
// `www.kungal.com/topic/1` is a RELATIVE link and resolves against the current
// page, which is the bug this exists to prevent.
import { describe, expect, it } from 'vitest'
import { MENTION_SCHEME, QUOTE_SCHEME, normalizeLinkHref } from '../src'

const cases: [input: string, expected: string, why: string][] = [
  // ── schemeless host → https ────────────────────────────────────────────────
  ['www.kungal.com/topic/1', 'https://www.kungal.com/topic/1', 'the reported case'],
  ['kungal.com', 'https://kungal.com', 'bare apex domain'],
  ['KunGal.COM/Topic', 'https://KunGal.COM/Topic', 'case is preserved, not lowercased'],
  ['example.com:8080/x', 'https://example.com:8080/x', 'host:port is not a scheme'],
  ['example.com?q=1', 'https://example.com?q=1', 'query straight after the host'],
  ['example.com#top', 'https://example.com#top', 'fragment straight after the host'],
  ['a.co.uk/x', 'https://a.co.uk/x', 'multi-label domain'],
  ['10.0.0.5:8080/x', 'https://10.0.0.5:8080/x', 'bare IPv4 host'],
  ['  www.kungal.com  ', 'https://www.kungal.com', 'trimmed first'],

  // ── already a URL → untouched ──────────────────────────────────────────────
  ['https://a.com', 'https://a.com', 'nothing to do'],
  ['HTTP://A.com', 'HTTP://A.com', 'scheme match is case-insensitive'],
  ['mailto:me@a.com', 'mailto:me@a.com', 'other schemes are fine'],
  ['tel:+8613800138000', 'tel:+8613800138000', 'so is tel:'],
  ['magnet:?xt=urn:btih:x', 'magnet:?xt=urn:btih:x', 'and anything else with a scheme'],
  [`${MENTION_SCHEME}42`, 'kungal-user:42', 'the mention scheme must survive'],
  [`${QUOTE_SCHEME}abc`, 'kungal-reply:abc', 'so must the quote scheme'],

  // ── deliberately relative → untouched ──────────────────────────────────────
  ['/topic/1', '/topic/1', 'site-absolute path'],
  ['./readme.md', './readme.md', 'the escape hatch for a relative file'],
  ['../up/x', '../up/x', 'and for a parent path'],
  ['#anchor', '#anchor', 'in-page anchor'],
  ['?tab=md', '?tab=md', 'query-only'],
  ['//cdn.a.com/x', '//cdn.a.com/x', 'protocol-relative already works'],
  ['guide/styling.md', 'guide/styling.md', 'a relative path with no dotted host'],
  ['draft', 'draft', 'not a host at all'],
  ['hello world', 'hello world', 'not a URL at all'],
  ['', '', 'empty stays empty (the command treats it as a no-op)'],
  ['   ', '', 'blank collapses to empty'],

  // ── email → mailto ─────────────────────────────────────────────────────────
  ['me@kungal.com', 'mailto:me@kungal.com', 'https:// would read it as userinfo'],
  ['a.b+c@sub.kungal.com', 'mailto:a.b+c@sub.kungal.com', 'dots and plus in the local part']
]

describe('normalizeLinkHref', () => {
  it.each(cases)('%s → %s (%s)', (input, expected) => {
    expect(normalizeLinkHref(input)).toBe(expected)
  })

  it('is idempotent', () => {
    for (const [input] of cases) {
      const once = normalizeLinkHref(input)
      expect(normalizeLinkHref(once)).toBe(once)
    }
  })
})
