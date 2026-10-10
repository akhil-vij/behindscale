// svg-no-c2pa: no authored SVG may carry a C2PA content-credentials block.
//
// Design deliveries can arrive with a signed C2PA manifest embedded in each
// SVG (a <metadata><c2pa:manifest> holding ~8KB of base64, plus an
// xmlns:c2pa declaration). The problem-page diagrams are inlined into the
// prerendered HTML and the client bundle, so one delivery of 16 files added
// 109KB to the page and 124KB to the JS (2026-10-09). The owner's rule: strip
// it from the files themselves. This check catches the next delivery at
// commit time, across every SVG in content/ and the top of public/,
// referenced or not.

import type { Check, CheckError } from '../types'

// The markers of an embedded manifest. Any one is enough.
const MARKERS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'an xmlns:c2pa namespace declaration', re: /\bxmlns:c2pa\s*=/i },
  { name: 'a <c2pa:...> element', re: /<c2pa:[a-z]/i },
  { name: 'a <metadata> block holding a C2PA/JUMBF manifest', re: /<metadata\b[^>]*>[\s\S]*?\b(?:c2pa|jumbf)\b[\s\S]*?<\/metadata>/i },
]

export function c2paMarkers(src: string): string[] {
  return MARKERS.filter((m) => m.re.test(src)).map((m) => m.name)
}

export const svgNoC2pa: Check = {
  name: 'svg-no-c2pa',
  run: (content) => {
    const errors: CheckError[] = []
    for (const [path, src] of content.allSvgs) {
      const found = c2paMarkers(src)
      if (found.length === 0) continue
      errors.push({
        file: path,
        message: `carries a C2PA content-credentials block (${found.join('; ')})`,
        fix: [
          'delete the <metadata>...</metadata> element and the xmlns:c2pa attribute from the root <svg>',
          'the drawing itself is unaffected; the manifest only adds bytes to the inlined page and bundle',
        ],
      })
    }
    return errors
  },
}
