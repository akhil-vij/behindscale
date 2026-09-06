# Handoff: problem detail page port — read in this order

1. `REPO-BRIEF-problem-page-port.md` — the task. Step 1 (lookup report) before any code.
2. `problem-page-v7.3.html` — the approved reference build. The spec for copy, rules,
   engine, layout and tokens. Where the brief and this file disagree, this file wins;
   say so.
3. `CHANGELOG-v7.3.md` — the design pass, stated as rules. §1 token table, §2 the cue
   rule, §3 motion, §6 what a refactor would break. Port from this, not from the CSS diff.
4. `DECKS-v6-1.md` — the 12 clean decision sets and their bills. The rules-parity test
   asserts against it line for line.
5. `headless-tests/` — the prototype click-through scripts and a README. Starting point
   for the §5.2 test, not a finished harness.

Also available on request from the owner: `behindscale-board.md` (class sources, accent
registry, sourcing rules) and `ui-context.md` (current token doc; the brief asks whether it
is still the source of truth and has you update it).

Not included on purpose: earlier prototypes (v5–v7.2), the v5/v6/v7 briefs,
READABILITY-v6.2.md, NOTES-v6.md. The copy is in v7.3; the history is not the spec.
