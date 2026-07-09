# behindscale

## Overview

behindscale is a system design learning platform. It studies how the
world's top engineering teams solve real problems at scale by dissecting
their public engineering blog posts. Each studied article becomes a
structured summary plus an interactive visual artifact that surfaces the
underlying, reusable patterns — and connects them to patterns seen in
other articles. The goal is to build durable, transferable system design
intuition over time, not just to read one-off posts.

It serves two audiences: primarily its owner (a personal, compounding
learning library), and secondarily the public (a browsable reference and
portfolio at behindscale.com).

## Goals

1. Turn any engineering blog post into a structured summary + interactive
   artifact with minimal manual effort.
2. Make patterns first-class: every article extracts named patterns, and
   patterns are tracked across articles so recurring ideas become visible.
3. Be accessible from any device (phone, laptop, tablet) via a single URL.
4. Stay cheap to run and operate (free hosting, a few dollars/month in API
   costs).

## Core User Flow

1. The pipeline (or the owner manually) selects an engineering blog post.
2. The post is fetched and cleaned into readable text.
3. Claude analyzes it into a structured summary: tags, problem, solution,
   patterns, tradeoffs, and cross-references to previously studied posts.
4. Claude generates an interactive React artifact visualizing the
   architecture, tradeoffs, failure scenarios, and patterns.
5. The summary and artifact are published to the site.
6. A visitor opens behindscale.com on any device, browses the article
   index, reads a summary, and explores its interactive artifact. They can
   also browse the aggregated pattern library.

## Features

behindscale is organized around **two equally first-class navigation axes**:
articles (what was published) and patterns (what was learned). Each article
references the patterns it embodies; each pattern lists the articles where it
appears. You can enter from either side and traverse to the other. The
article feed is the *daily reading surface*; the pattern library is the
*durable knowledge surface*.

### Article Library (the daily reading surface)

- Home page (`/`) is the article feed — newest articles first. This is the
  primary daily-use entry point.
- Searchable, filterable index of all studied articles (by company, tag,
  date, pattern).
- Per-article page: structured summary (reading view) + embedded
  interactive artifact (exploration view). Every article names its
  **crux** — the bottleneck that made the problem hard — as a
  first-class element, tagged into a cross-article bottleneck
  taxonomy (`cruxTag`) that complements the pattern library:
  patterns name solutions, cruxes name problems.
- Each article card and article page surfaces **pattern chips** — the 2–3
  patterns this article embodies. Clicking a chip navigates to the pattern's
  detail page.
- **Visible source attribution** on every article — index cards, article
  page header, and pattern library back-links all surface the official
  engineering blog the article came from (e.g. "Uber Engineering",
  "Stripe Engineering"), with a link to the original post and to the
  source blog's homepage. The reader can always see and verify the source.

### Pattern Library (the durable knowledge surface)

- A prominent navigation entry, `/patterns`, leading to the pattern library
  index — a grid of every known pattern with its frequency count
  (e.g. "Seen in 7 articles across 5 companies") and a teaser.
- **Per-pattern detail page** (`/patterns/:slug`) — the deep-study surface
  for a single pattern. Shows the pattern's definition, when it applies, the
  tradeoffs it implies, and the full list of articles that embody it. Each
  article in the list shows its source attribution so the reader can see
  *which companies have hit this problem*.
- Pattern definitions are hand-authored or hand-reviewed (not auto-generated
  from a single article). The synthesis across articles is where the
  learning compounds, and that requires deliberate curation.
- Bidirectional cross-linking with the article library: articles → their
  patterns (via chips), patterns → their articles (via back-link cards).
- Surfaces recurring, transferable ideas (the core learning payoff).

### Interactive Artifacts

- Self-contained interactive React visualizations per article.
- Rendered in isolation so a single broken artifact never breaks the site.
- Standalone-friendly: every artifact opens with a collapsible
  context block (the problem, the move, what to try) and links back
  to its article, so a shared artifact URL teaches on its own.


## Scope

### In Scope

- Static website that renders pre-generated summaries and artifacts.
- A build-time pipeline (run via Claude Code) that discovers, analyzes,
  generates, and publishes content.
- Reading view (light, editorial) + interactive artifacts (dark, technical).
- Pattern aggregation across articles.
- Content sourced **exclusively from official company engineering blogs**
  (the current allowlist in `content/feeds.json`: Amazon Builders'
  Library, Airbnb Engineering, Discord Engineering, Engineering at
  Meta, Figma Blog, The GitHub Blog, Netflix Technology Blog, Notion
  Blog, Shopify Engineering, Slack Engineering, Stripe Engineering,
  Uber Engineering — fourteen articles across those sources as of
  2026-07-09). The signal-to-noise ratio of first-party engineering
  writeups is what makes the library valuable; personal blogs,
  third-party summaries, and aggregators dilute it and are excluded.

### Out of Scope (initially)

- User accounts, authentication, and per-user saved state.
- A backend database or server-side rendering at request time.
- Comments, social features, or user-generated content.
- Real-time/scheduled execution inside the website itself (scheduling is
  handled by the pipeline + CI, not the site).
- **Personal blogs, Substacks, Hacker News writeups, conference talk
  recaps, third-party summaries, and aggregator sites.** Even when these
  cover the same material, they are excluded by policy. Only the official
  engineering blog of the company that built the system qualifies.

## Success Criteria

1. Running a single pipeline command turns a blog URL into a published
   summary + artifact visible on the site.
2. A visitor can browse the article index and open any artifact on both
   mobile and desktop.
3. The pattern library correctly aggregates patterns across all articles
   with accurate frequencies and back-links.
4. **Bidirectional navigation works end to end:** clicking a pattern chip
   on any article card or article page navigates to that pattern's detail
   page; the pattern detail page lists every article embodying it, each
   with source attribution, and links back to the article page.
5. A malformed generated artifact fails in isolation without breaking the
   site build or other artifacts.
6. `npm run build` passes and the site deploys to behindscale.com.
