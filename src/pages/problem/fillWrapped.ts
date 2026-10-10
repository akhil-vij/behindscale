// Wrapped YOU-diagram slots (comparison diagrams v2). Ported from the design
// agent's you-wrap.js `fillWrapped(el, str)` as pure string functions, so the
// filled SVG is still built as markup (fillSlots) rather than patched in the
// DOM after React renders it.
//
// A slot opts in on its <text>: data-wrap (characters per row), data-lines
// (maximum rows), data-line-height (viewBox units). Greedy word wrap on
// spaces; the strings' natural breaks (" · " and ", ") fall out of that. A
// string that needs more rows than allowed is cut short with "…" on the last
// row (`cut: true`): the unit test asserts no youMapping() string ever is.
// The memory slot (.slabel) is centred in its box: its y is the first row's
// baseline when every row is used, so each unused row shifts the block DOWN
// by half a row. (you-wrap.js shifted it up, which pushed a two-row label
// through the top edge of its box at 390px; corrected here.)

export interface WrapSpec {
  wrap: number
  lines: number
  lineHeight: number
}

export function wrapLines(str: string, spec: WrapSpec): { lines: string[]; cut: boolean } {
  const lines: string[] = []
  let cur = ''
  for (const w of str.split(' ')) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > spec.wrap && cur) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  if (lines.length <= spec.lines) return { lines, cut: false }
  const kept = lines.slice(0, spec.lines)
  kept[spec.lines - 1] = kept[spec.lines - 1].slice(0, spec.wrap - 1) + '…'
  return { lines: kept, cut: true }
}

// The wrap spec on a <text> element's attribute string, or undefined when the
// slot doesn't wrap.
export function wrapSpecOf(attrs: string): WrapSpec | undefined {
  const num = (name: string) => {
    const m = new RegExp(`\\b${name}="([0-9.]+)"`).exec(attrs)
    return m ? Number(m[1]) : undefined
  }
  const wrap = num('data-wrap')
  if (wrap === undefined) return undefined
  return { wrap, lines: num('data-lines') ?? 1, lineHeight: num('data-line-height') ?? 0 }
}

// The tspan rows for one wrapped slot. `escape` is applied to each row's text.
export function wrappedTspans(attrs: string, str: string, spec: WrapSpec, escape: (s: string) => string): string {
  const { lines } = wrapLines(str, spec)
  const x = /\bx="([^"]*)"/.exec(attrs)?.[1] ?? '0'
  const centred = /\bclass="[^"]*\bslabel\b/.test(attrs)
  const shift = centred ? ((spec.lines - lines.length) / 2) * spec.lineHeight : 0
  return lines
    .map((ln, i) => `<tspan x="${x}" dy="${i === 0 ? shift : spec.lineHeight}">${escape(ln)}</tspan>`)
    .join('')
}
