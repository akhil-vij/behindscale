# behindscale

## Overview

behindscale is a system design learning platform. It studies how the
world's top engineering teams solve real problems at scale by dissecting
their public engineering blog posts. Each studied post becomes a
structured dissection plus an interactive artifact the reader can push
past its limit and then fix. Every dissection names its **crux**, the
bottleneck that made the problem hard, and files it under a **problem
class**; the solutions it uses are filed as **patterns**. Those two
cross-article taxonomies turn single posts into comparisons: several
companies hitting the same wall and answering it differently. The goal
is durable, transferable system design intuition, not one-off reading.

It serves two audiences: primarily the public at behindscale.com, written
for senior and staff engineers building real system design depth, often
for interviews; and secondarily its owner (a personal, compounding
learning library).

## Goals

1. Turn first-party engineering posts into structured dissections with
   interactive artifacts, at a quality bar that holds as the library grows
   (`docs/behindscale-taste.md`).
2. Make problems and patterns first-class: every article names its crux
   and the patterns it embodies, and both are tracked across articles so
   recurring problems and recurring solutions become visible.
3. Be accessible from any device (phone, laptop, tablet) via a single URL.
4. Stay cheap to run and operate: a static site on free-tier hosting, with
   no servers or per-request costs.

## Core User Flow

Content is authored by hand:

1. The owner picks a post from an official engineering blog on the source
   allowlist (`content/feeds.json`), favouring posts that make an existing
   pattern or problem class recur at another company.
2. The owner reads it and drafts the dissection with Claude in chat: the
   article (summary, crux and problem class, problem, solution, tradeoffs,
   pattern references with notes), any new pattern definitions, the
   artifact, and figures where a diagram earns its place.
3. The files arrive as a round, with larger briefs under `handoff/`; a
   design agent supplies the SVG drawings for figures and lesson diagrams.
4. Claude Code places the files under `content/`, validates, builds,
   tests, commits on a branch and opens a pull request; merging deploys,
   and Claude Code verifies the live site. Everything derived (counts,
   problem pages, pattern back-links, feed, sitemap) updates on its own.

Problem pages grow one authored block at a time
(`docs/authoring-problem-pages.md`); a full lesson is a bigger round (a
fact-checked copy brief and prototype, the designer's drawings, a port).

## Features

Navigation has a **primary axis of problem class**, a **secondary axis
of company**, and **patterns as the lateral layer** linking articles
across companies. Patterns name *solutions*, cruxes name *problems*; the
two taxonomies are what make the library compound. The nav carries
Problems, Patterns and Search; the footer adds Sources and the feed.

- **Landing (`/`): conversion.** A billboard, not a feed: a headline
  promising "break them, then fix them", a live artifact (the
  load-shedding pattern demo) as the dominant visual, a company trust
  band, a "built for Senior and Staff engineers" block, a preview of the
  problem classes several companies hit, and one CTA into `/problems`.
- **Problems (`/problems`): the workbench.** Every article, grouped by
  problem class, the classes with the most systems first. Each group links
  to its problem page, with ▶ PLAYABLE (and a time estimate) and SIDE BY
  SIDE badges when that page has a lesson or a comparison. Carries the
  **company filter** and **client-side search**, both kept in the URL so
  a view can be shared. `/catalog` redirects here.
- **Problem pages (`/problems/:urlSlug`).** Every problem class has one,
  built from its member articles: the definition, every system that hit
  it, the patterns in the class, and a card per breakdown, with prev/next
  links through the classes. In the site's voice a problem class is a
  **wall**. Authored blocks in `content/problems/<cruxTag>.json` replace
  their derived counterparts one at a time; a lede alone is complete.

### Lessons (playable walls)

A wall with the full authored block set is a lesson, walked through a
station nav (try it, build it, compare, decide, go deeper, interview),
each station with a minute budget:

- **Try it:** the wall in short prose and company-attributed stats, and a
  small artifact where the reader causes the failure.
- **Build it:** the mission. The reader owns the system, makes a set of
  design decisions and runs a day of traffic; failure cards name the
  company that wrote about each failure, then attacks taken from the
  posts hit the design that survived.
- **Compare:** after optionally locking in one sentence on why their
  design works, the reader sees the companies' answers side by side
  (diagrams, an at-a-glance table, full answers per question), with a
  **YOU** row and column filled from their own design.
- **Decide, steal, interview:** "Which answer is yours" maps a situation
  to a company, "What to steal" lists the rules worth keeping, and the
  interview section has one follow-up per attack, ticked when the
  reader's design held it.
- The design is saved in the reader's own browser and restored on return.
  Without JavaScript a figure and a static mission outline stand in.

### Articles and Patterns

- **Article pages (`/articles/:slug`):** the structured summary (reading
  view) plus an embedded artifact (exploration view), figures inline
  where authored. The crux callout links to its problem page, "Also
  solving this" lists the other systems in the class, and **pattern
  chips** link to each pattern the article embodies. **Source
  attribution** shows everywhere an article appears (the official blog,
  the original post, the blog's homepage), so the reader can verify it.
- **`/patterns`:** every pattern, grouped into five categories by the job
  it does, with its evidence (breakdowns and companies), search and a
  category filter. **`/patterns/:slug`:** a mechanism artifact where one
  is authored, the definition, when it applies, tradeoffs, every system
  that uses it (with a note in that system's terms), patterns used
  alongside it, and the problems it answers.
- Pattern definitions are hand-authored or hand-reviewed, never generated
  from one article. Counts and back-links derive from the articles at
  build time, never stored.

### Interactive Artifacts

- Self-contained React artifacts: one per article, on many pattern pages,
  the try-it and mission on each lesson, and the landing hero. Each runs
  in a sandboxed iframe, so one broken artifact never breaks the site.
- Standalone-friendly: each has a full-screen page linking back to the
  page that owns it, and article artifacts open with a collapsible context
  block (the problem, the move, what to try), so a shared URL teaches on
  its own.

### Sources and Distribution

- **`/sources`:** the sourcing policy in one line, then every allowlisted
  blog with its dissection count, linking into `/problems` filtered to it.
- Pages are prerendered with structured data and a share image; an Atom
  feed (`/rss.xml`) and a sitemap cover the content. Vercel Analytics is
  mounted; custom events wait on `context/open-decisions.md` #29.

## Scope

### In Scope

- A static, prerendered website over hand-authored content in `content/`
  (articles, patterns, the problem-class registry `content/cruxtags.json`,
  problem pages, artifacts, figures), validated on every build.
- Reading view (light, editorial) + interactive artifacts (dark, technical).
- Content sourced **exclusively from official company engineering blogs**
  on the allowlist (`content/feeds.json`, shown on `/sources`). First-party
  signal-to-noise is what makes the library valuable.

### Deferred

- **The content pipeline.** A Claude-driven pipeline (discover posts,
  fetch them, draft the article and artifact for human review) was
  designed and deferred on 2026-06-04, and never built; there is no
  `pipeline/` code. Design: `context/pipeline-architecture-deferred.md`.
- **Interview, company and newsletter pages** are designed in
  `docs/nav-ia-decisions.md` but not built. The problem-page subscribe
  card stays hidden until a signup URL is set in `src/config/site.ts`.

### Out of Scope (for now)

- User accounts, authentication, and server-side per-user state.
- A backend database or server-side rendering at request time.
- Comments, social features, user-generated content, or scheduled
  execution inside the website itself.
- **Personal blogs, Substacks, Hacker News writeups, conference talk
  recaps, third-party summaries, and aggregator sites**, even when they
  cover the same material. Only the official engineering blog of the
  company that built the system qualifies.

## Success Criteria

1. New authored files reach a live page through validate, build and
   deploy, and a malformed file fails the build instead of shipping.
2. A visitor can browse `/problems` and open any article, problem page,
   pattern page, or artifact on both mobile and desktop.
3. Pattern and problem pages aggregate every article with accurate,
   derived counts, and navigation works end to end: pattern chips reach
   pattern pages, pattern pages list every article (with attribution) and
   the problems they answer, and articles and problem pages link both ways.
4. A lesson plays end to end on phone and desktop: a survived day fills
   the YOU column and interview ticks, a return visit restores the
   design, and the page still reads without JavaScript.
5. A malformed artifact fails in isolation without breaking the build,
   its page, or other artifacts.
6. `npm run build` passes and the site deploys to behindscale.com.
