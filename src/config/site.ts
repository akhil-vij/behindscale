// Site-level configuration the owner flips as distribution surfaces come
// online. Static-by-construction (invariant 1): plain constants, read at build
// time, no runtime fetch.

// The newsletter lives on Substack. `newsletterSignupUrl` is the "Subscribe free
// on Substack ↗" button in SignupCard (the landing, the end of every lesson and
// every article); EMPTY = no signup card renders anywhere. `newsletterUrl` is
// the footer's "Newsletter ↗" link to the publication's home. Both open in a
// new tab. Nothing links to a page that doesn't exist yet (invariant 7).
export const newsletterSignupUrl = 'https://behindscale.substack.com/subscribe'
export const newsletterUrl = 'https://behindscale.substack.com'

// The "Latest:" line under the signup button: a link to the most recent
// edition so a reader can sample before subscribing. Hidden while `url` is
// empty (the state until the first edition, Nov 16). Set both fields to show
// it; `title` is the edition's headline.
export const newsletterLatestEdition = { url: '', title: '' }

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
