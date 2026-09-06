# Headless click-through scripts (from the prototype rounds)

Both ran against the standalone prototype with jsdom 24, timers accelerated (setTimeout
/200, rAF stepping a fake clock). They are a starting point for the repo's §5.2 test, not a
finished harness: selectors assume the prototype's ids, and the file under test is read as
`problem-page-v6.html` in the working directory.

- `clickthrough-default.mjs` — naive day → clean day (AWS deck, window forever) → commit →
  A1 accept → A2 flip/repair → A3 forever → A4 params → A5 forever→bound→straggler→
  reconcile → debrief. Also asserts the YOU column, diagram, commit persistence and
  interview ticks.
- `clickthrough-freeplay.mjs` — prototype-only mode; do not port. Kept for reference on
  how out-of-order attack entry behaves.

Install: `npm i jsdom@24`. Run: `node clickthrough-default.mjs`.
