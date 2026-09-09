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

// The landing hero's cross-link to the load-shedding wall (F20). The old "See
// how →" promised a drop-order comparison /problems/blind-load-shedding does
// not carry yet, so the copy is scoped to what exists: five companies, five
// posts. When that wall lands its comparison, flip `lead` + `linkLabel` back to
// the comparison framing ("Five companies hit this same wall and each chose a
// different drop order." / "See how →") -- one field, and `href` never changes.
export const heroWallPromise = {
  lead: 'Five companies hit this same wall.',
  linkLabel: 'Read the five →',
  href: '/problems/blind-load-shedding',
}
