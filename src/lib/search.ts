// Client-side search matcher shared by /problems and /patterns (findability
// batch, F19). One model for both surfaces: a result is a bag of weighted,
// kind-labelled Terms; a query is tokenised and EVERY query token must
// prefix-match a token somewhere in the bag (AND across query tokens). The
// match carries a `matched` reason -- the highest-signal NON-title term the
// query hit -- so the list can show `matched: tag kafka` under a card whose
// title never mentioned Kafka. That line is what makes tag / keyword /
// definition recall trustworthy instead of noisy.
//
// Matching rules (Batch 3 brief): case-insensitive; multi-word queries are
// tokenised; prefix match on tokens; no stemming beyond that. Pure and
// framework-free, so it unit-tests without a DOM and runs identically at build
// time and in the browser.

// A single searchable value on a result. `value` is displayed verbatim in the
// matched: line for SHORT kinds (tag, keyword, pattern name, company); for
// LONG kinds (definition, summary, prose) `long: true` makes the matched: line
// show the query token that hit instead of dumping the whole blob.
export interface Term {
  kind: string
  value: string
  weight: number
  long?: boolean
}

export interface MatchReason {
  kind: string
  value: string
}

export interface MatchResult {
  score: number
  // null when the title/name already carried the whole query (an obvious
  // match needs no explanation) or when the query was empty.
  matched: MatchReason | null
}

// Kinds that count as "the title" -- a query satisfied entirely by these
// produces no matched: line.
const TITLE_KINDS = new Set(['title', 'name'])

// Lowercase and split on every run of non-alphanumerics. Applied identically
// to the query and to each term's value, so "exactly-once" and "exactly once"
// tokenise the same and "rate-limiting" finds "rate limiting".
export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

// Returns null when the query does NOT match (some query token found no prefix
// hit anywhere in the bag). An empty query returns a zero-score match with no
// reason -- callers treat an empty query as "show everything" upstream, so this
// is only reached defensively.
export function matchTerms(query: string, terms: readonly Term[]): MatchResult | null {
  const qTokens = tokenize(query)
  if (qTokens.length === 0) return { score: 0, matched: null }

  const bag = terms.map((term) => ({ term, tokens: tokenize(term.value) }))
  const hits = new Set<number>()

  for (const qt of qTokens) {
    let hitThisToken = false
    for (let i = 0; i < bag.length; i++) {
      if (bag[i]!.tokens.some((tk) => tk.startsWith(qt))) {
        hits.add(i)
        hitThisToken = true
      }
    }
    // AND semantics: a query token that matches nothing sinks the whole result.
    if (!hitThisToken) return null
  }

  let score = 0
  for (const i of hits) score += bag[i]!.term.weight

  const titleCarriesAll = qTokens.every((qt) =>
    bag.some(
      (b) => TITLE_KINDS.has(b.term.kind) && b.tokens.some((tk) => tk.startsWith(qt)),
    ),
  )

  let matched: MatchReason | null = null
  if (!titleCarriesAll) {
    // The best non-title term the query hit, by weight (stable: first wins ties).
    let best: number | null = null
    for (const i of hits) {
      const t = bag[i]!.term
      if (TITLE_KINDS.has(t.kind)) continue
      if (best === null || t.weight > bag[best]!.term.weight) best = i
    }
    if (best !== null) {
      const b = bag[best]!
      const value = b.term.long
        ? // For a long field, show the query token that hit it, not the blob.
          (qTokens.find((qt) => b.tokens.some((tk) => tk.startsWith(qt))) ?? b.term.value)
        : b.term.value
      matched = { kind: b.term.kind, value }
    }
  }

  return { score, matched }
}
