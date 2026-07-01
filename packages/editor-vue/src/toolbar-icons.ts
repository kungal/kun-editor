// Inline SVG icons for the toolbar. Full `<svg>…</svg>` strings (rendered via
// v-html on a <span>, so the browser parses them in the SVG namespace — v-html
// directly on an <svg> element would create HTML-namespaced children that don't
// render). Kept dependency-free (no icon kit); `currentColor` inherits the
// button text colour. A later increment can swap these for @kungal/ui-vue's
// KunIcon if a host wants the shared lucide set.

const svg = (inner: string): string =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`

const text = (label: string, size = 13): string =>
  `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><text x="12" y="12" dominant-baseline="central" text-anchor="middle" font-size="${size}" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif" fill="currentColor">${label}</text></svg>`

export const TOOLBAR_ICONS = {
  bold: svg('<path d="M6 4h8a4 4 0 0 1 0 8H6z"/><path d="M6 12h9a4 4 0 0 1 0 8H6z"/>'),
  italic: svg('<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>'),
  strike: svg('<path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/>'),
  code: svg('<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>'),
  h1: text('H1', 11),
  h2: text('H2', 11),
  h3: text('H3', 11),
  bulletList: svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none"/>'),
  orderedList: svg('<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-1.5 2-2.5S5 14 4 14.5"/>'),
  quote: svg('<path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" fill="currentColor" stroke="none"/>'),
  codeBlock: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m9 10-2 2 2 2"/><path d="m15 10 2 2-2 2"/>'),
  hr: svg('<line x1="4" y1="12" x2="20" y2="12"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.8" fill="currentColor" stroke="none"/><path d="m21 15-4.5-4.5a2 2 0 0 0-2.8 0L5 19"/>'),
  spoiler: svg('<path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.6 6.6A13.5 13.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/><line x1="2" y1="2" x2="22" y2="22"/>'),
  latex: text('Σ', 15)
} as const
