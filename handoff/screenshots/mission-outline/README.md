# Mission visible without JavaScript — report screenshots

Captured 2026-09-06 from the production build (`vite preview`) in headless
Chromium, branch `feat/problem-mission-outline`.

| File | What it shows |
|---|---|
| `top-1440.png`, `top-390.png` | the page top: lede, then the "how this page works" strip (item 1) above the sticky station nav |
| `outline-1440.png`, `outline-390.png` | "Build the defense": the composed decisions sentence (item 2) and the "What's inside the mission" card (item 3a); three columns at 1440, stacked at 390 |
| `decide-highlight-1440.png` | after clicking the first "Which answer is yours" row: the page scrolled to the at-a-glance table, Stripe + AWS columns in the YOU column's grammar (item 4) |
| `decide-row-1440.png` | the clicked row (`aria-pressed`) among the four |
| `mission-noscript-1440.png` | JavaScript disabled: the Build section through the mission frame's `<noscript>` -- the outline card, then the same three lists as plain text (item 3b) |
| `tryit-noscript-1440.png` | JavaScript disabled: the try-it frame's `<noscript>` with its one added sentence (item 3b) |

Fonts on the light shell are the site's own; the artifact frames do not
appear in the no-JS captures by design (that is the point of the fallback).
