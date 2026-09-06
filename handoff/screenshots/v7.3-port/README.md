# v7.3 port — deliverable screenshots (brief §6)

Captured 2026-09-06 from the production build (`vite preview`) in headless
Chromium at 1440 / 1024 / 390, one file per state and width
(`<state>-<width>.png`). The mission was driven at 2× through the brief's
default path; state carries across the captures in order.

| State | File prefix | What it shows |
|---|---|---|
| Top of page | `top` | header, lede, sticky station nav, intro |
| Try it | `tryit` | the ambiguity window after cut 3 → retry with key → replica |
| Mission before a run | `mission-before` | the naive deck, RUN cue pulsing |
| Mission after a survived day | `mission-survived` | the AWS deck, THE BILL, the commit box |
| An attack with a group glowing | `attack-glow` | A2 watched: READS glowing, RE-RUN THE ATTACK |
| The debrief | `debrief` | all five attacks held, the generated debrief with "You said" |
| Comparison with YOU filled | `comparison-you`, `comparison-matrix` | the YOU diagram row + "You said" foot; the matrix with the YOU column |
| The interview table | `interview-ticks` | live ✓ ticks after the held attacks |

Fonts are the fallback mono stack (no JetBrains Mono fetch inside the
sandboxed frames), a recorded visual deviation from the reference build.

Re-captured 2026-09-06 (branch `fix/problem-tryit-reset-specificity`) after
the try-it reset fix and the legibility pass: every artifact-state frame is
an element capture inside a viewport tall enough for it — a full-page
capture leaves an out-of-process sandboxed iframe unpainted, which is why
the first set was blank. The phone mission frames keep a 780px viewport so
the 90dvh scrollport shows as a phone sees it.
