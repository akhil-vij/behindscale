// The default share image URL that every page's og:image / twitter:image
// carries (prerendered routes and standalone artifact pages alike).
//
// The URL carries a short hash of the PNG's contents (?v=<hash>). Link-preview
// services cache by URL: LinkedIn kept a blurry preview for the homepage and
// pattern pages (first inspected while og-default.png was still a 404) while
// problem pages, inspected later, were sharp, with identical tags. A new URL
// makes every service fetch and process the image again, and the hash changes
// by itself whenever the image does. scripts/check-share-images.ts checks the
// path part exists in dist/.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE_URL = 'https://www.behindscale.com'
const OG_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og-default.png')

export function ogImageUrl(file: string = OG_FILE): string {
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8)
  return `${SITE_URL}/og-default.png?v=${hash}`
}
