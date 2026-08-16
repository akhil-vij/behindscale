// figure-svg-safe: build-time hygiene check on the contents of every
// present figure SVG (docs/figures-design.md §0.4, §4, Q11).
//
// **Not** the security perimeter. Figures render as
//   <img src="/figures/<article>/<slug>.svg">
// so the browser's <img>-sandbox is what prevents SVG scripts from
// executing (per spec). This check enforces a stricter build-time
// well-formedness bar that also guards the JSON-LD `image` file and
// any future direct-link view.
//
// Rejected constructs (Q11 allowlist, tightened by the owner):
//   - <script> tags
//   - <foreignObject> (XSS vector in some SVG contexts)
//   - <style> (SVG-embedded styles leak into the page unless scoped;
//     one-palette policy means figures should not carry style)
//   - on* event handler attributes (onclick, onload, onmouseover, ...)
//   - javascript: URLs anywhere
//   - <image href="data:..."> base64 raster smuggling (would reopen
//     the SVG-only policy)
//   - off-repo href/xlink:href on <image>, <use>, <a> -- fetching
//     external assets at render time contradicts the site's
//     static-by-construction invariant
//
// Skipped: entries whose contents is null (that is figure-svg-
// exists's job).

import type { Check, CheckError } from '../types'
import { figureHosts } from '../figure-hosts'

interface Violation {
  message: string
}

const CHECKS: ReadonlyArray<{
  name: string
  message: string
  test: (src: string) => boolean
}> = [
  {
    name: 'script',
    message: 'contains a <script> tag',
    test: (s) => /<script\b/i.test(s),
  },
  {
    name: 'foreignObject',
    message: 'contains a <foreignObject> tag',
    test: (s) => /<foreignObject\b/i.test(s),
  },
  {
    name: 'style',
    message:
      'contains a <style> tag (figures inherit page styles, not their own)',
    test: (s) => /<style\b/i.test(s),
  },
  {
    name: 'on-attr',
    message:
      'contains an on* event handler attribute (onclick, onload, onmouseover, ...)',
    // Match on<letters>= with optional whitespace before =. Word-
    // boundary before "on" prevents false positives inside longer
    // attribute names.
    test: (s) => /\bon[a-z]+\s*=/i.test(s),
  },
  {
    name: 'javascript-url',
    message: 'contains a `javascript:` URL',
    test: (s) => /javascript\s*:/i.test(s),
  },
  {
    name: 'data-image',
    message:
      'contains an <image href="data:..."> (base64 raster smuggling; policy is SVG-only)',
    // Loose match: <image ... href="data: or xlink:href="data:
    test: (s) =>
      /<image\b[^>]*\b(?:xlink:)?href\s*=\s*["']\s*data:/i.test(s),
  },
]

// Matches href / xlink:href attributes on <image>, <use>, <a>. Any
// value not starting with '#' (in-document fragment) is off-repo and
// rejected -- fetching external assets at render time contradicts
// static-by-construction.
const OFF_REPO_REF_RE =
  /<(image|use|a)\b[^>]*\b(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi

function findOffRepoRefs(src: string): Violation[] {
  const out: Violation[] = []
  let m: RegExpExecArray | null
  const seen = new Set<string>()
  while ((m = OFF_REPO_REF_RE.exec(src)) !== null) {
    const tag = m[1]
    const value = m[2]?.trim() ?? ''
    if (value.length === 0) continue
    if (value.startsWith('#')) continue
    // data: URLs on <image> are caught by the data-image rule above;
    // this branch catches http(s):, //, and any other off-fragment
    // reference on <image>/<use>/<a>.
    if (seen.has(`${tag}:${value}`)) continue
    seen.add(`${tag}:${value}`)
    out.push({
      message: `<${tag}> has an off-repo href/xlink:href \`${value}\` (must be a same-document fragment starting with "#")`,
    })
  }
  return out
}

export const figureSvgSafe: Check = {
  name: 'figure-svg-safe',
  run: (content) => {
    const errors: CheckError[] = []

    for (const host of figureHosts(content)) {
      for (const fig of host.figures) {
        const key = `${host.slug}/${fig.slug}`
        const entry = content.figureSvgs.get(key)
        if (entry === undefined || entry.contents === null) continue
        const src = entry.contents

        for (const rule of CHECKS) {
          if (rule.test(src)) {
            errors.push({
              file: entry.path,
              ...host.ref,
              message: `figure "${fig.slug}" ${rule.message}`,
              fix: [
                'remove the disallowed construct; see docs/figures-design.md §0.4 / Q11 for the allowlist',
              ],
            })
          }
        }

        for (const v of findOffRepoRefs(src)) {
          errors.push({
            file: entry.path,
            ...host.ref,
            message: `figure "${fig.slug}" ${v.message}`,
            fix: [
              'inline the referenced asset into the SVG, or replace with a "#"-prefixed in-document fragment reference',
            ],
          })
        }
      }
    }

    return errors
  },
}
