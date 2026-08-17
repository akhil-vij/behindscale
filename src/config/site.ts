// Site-level configuration the owner flips as distribution surfaces come
// online. Static-by-construction (invariant 1): plain constants, read at build
// time, no runtime fetch.

// The newsletter signup destination. EMPTY = no subscribe surface renders
// anywhere (the current state). Set it to flip every subscribe surface at once
// -- the problem-page "The weekly" card and (when it exists) the footer link.
//
// Distribution track (docs/problem-page-design.md §5b): the signup exists as an
// EXTERNAL hosted page (e.g. Buttondown) weeks before Phase 6's /newsletter
// ships. Point this there now; swap to "/newsletter" when that page lands. One
// value, every surface. Invariant 7 (no link to a 404) holds because the target
// exists before the link does.
//
// An absolute "https://..." value renders as an external link (new tab); a
// leading-slash value renders as an in-app route.
export const newsletterSignupUrl = ''
