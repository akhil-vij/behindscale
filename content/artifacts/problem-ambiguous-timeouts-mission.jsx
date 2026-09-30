import { useEffect } from 'react'
import { dayTokens } from './problem-ambiguous-timeouts-rules.js'

// Problem-level artifact - "The defense loop" (build-it mission), for
// /problems/ambiguous-timeouts. Ported from problem-page-v7.3.html (the
// approved reference build): the #artB markup, its styles, and Script 2
// (the mission engine: deck, stage geometry GH/GV on ONE animation script,
// events, run control, escalations, debrief, the single #artB[data-cue]
// attention cue, real-time dwells and kill-mark floors, reduced-motion
// beats) are the prototype's, VERBATIM. Sanctioned edits only: the RULES
// block lives in ./problem-ambiguous-timeouts-rules.js (imported), FREE
// PLAY (#freebtn / #freenote / ?free) is not ported (FREE is a constant
// false; the sequence gates stay as written), and the amber proto-notes are
// dropped. This React shell renders the markup once and boots the engine in
// an effect.
//
// Sanctioned edits (Batch 2, 2026-09-07 browser-audit fixes) -- each is a
// behaviour fix the batch brief names; the reference problem-page-v7.3.html
// is left untouched:
//   B2-1 (F6): a restore(decisions,survived,held) entry point on the engine
//     (returned to the bridge) reconstructs a saved design without animating;
//     the bridge calls it once from init, then emits state. The reset button
//     now posts a reset message and its narration changed.
//   B2-3 (F8): the stage clock label map gains size:'size-bound' -- WINDOW's
//     "bounded by size" option had no label and printed "keeps: undefined".
//     Audit of the other stage label maps (all complete vs GROUPS): CLIENT
//     {giveup,blind,key}, identity {none,hash,key}, reply {err|saved}. The
//     memory box draws storerec via the acid branch (a visual simplification,
//     not an undefined-label bug) -- left as-is, out of B2-3's scope.
//   B2-4 (F14): each dbl stamp during an attack (curLvl>0) adds to DOUBLES
//     via bumpAttackDouble(); a "today + attacks" sub-line (#meternote) shows
//     once any attack has run; freshDay (new day) and reset clear both. Side
//     effect: the host's write-once `caused` checkpoint (observes the meter
//     sum) can now also trip on an attack-caused double, not only a day.
//   B2-5 (F15): SUPERSEDED by the 2026-09 copy pass (F) — the 2× speed control
//     and its first-day auto-switch (+ the "Replays now run at 2×" clause) were
//     removed entirely. `speed` stays 1 (animation timing math untouched).
//   B2-7 (F17): focusDeckSel(k) re-focuses a group's selected option after
//     paintDeck() rebuilds the deck -- on a decision click, and after attacks
//     4/5 add a row (focus the new row's default) -- so keyboard focus is not
//     dropped to the top.
//   B2-8 (F21): .narr min-height 44px -> 77px (three lines) so the box no
//     longer grows 1->3 lines between events and shoves the stage.
//   B2-9 (F22): E3's DBL_CRASH card src "Stripe" -> "Stripe 2017"; the
//     MEMORY deck label q "Q2" -> "Q3" (READS keeps Q2); the standalone
//     footer backlink is same-tab (target dropped). Other year-less card
//     srcs are conversational teaching notes, listed in the PR, left as-is.
//   B2-11 (F24): STEP-promote + RUN-demote-to-ghost is now one reduced-motion
//     CSS rule (the JS inline STEP styling moved into it), so exactly one
//     control reads as primary under reduced motion.
//
// Sanctioned edits (Batch 1, 2026-09-08 layout spec) -- markup/CSS moves plus
// the four allowed engine touches; the RULES block, GROUPS/LEVELS, copy and the
// checkpoint contract are unchanged:
//   §1 (F1/F2/F13): the single .brow is now a two-column .mission-grid --
//     col-left (deck -> commit -> attacks/debrief) scrolls, col-right
//     (evchips -> narration -> stage -> controls -> bill -> log) is the sticky
//     working column on desktop (position:sticky; top:12px). The phone damage
//     toast is deleted (markup + bridge logic); the log sits under the stage.
//     "-> the decision" is now cueDecision(): a cue, not a page scroll, unless
//     the group is fully off-screen (A2).
//   §2 (F10/F11): phone collapses the grid to one re-ordered column (narration
//     -> stage -> controls -> log -> bill -> commit -> deck -> attacks ->
//     debrief) and the deck groups become a one-open-at-a-time accordion
//     (openGroup engine state, A3); the control row is not sticky, meters wrap
//     to a full-width 3-col line (F11).
//   §3 (F9): transient stage labels ("crash", "dropped", "reply lost", "seen
//     it ✓", "never seen", the reply verdict) route through placeLabel(zone) ->
//     a band slot (GH.bands / GV.bands), never a node rect; GV viewBox grows to
//     0 0 360 552 for the bank band.
//     DO NOT BAND the in-box memory status (#memrow, e.g. "K-4 ✓", "params
//     DIFFER ⚠"). Owner ruling (2026-09-09): that is the memory's CONTENTS --
//     state text describing what the box holds -- not a transient label ABOUT
//     an event, so the box is the right place (the same way bank verdicts stay
//     in the ledger panel). The F9 rule is "transient text never inside a node
//     rect"; state text is exempt.
//
// Sanctioned edits (Batch 3, 2026-09-09 findability F20) -- copy + a11y markup:
//   B3-2 (F20): the DAY SURVIVED narration said the bill was "itemized on the
//     right"; Batch 1 moved THE BILL under the stage, so it now reads
//     "itemized in THE BILL under the stage". One clause; the rest of the
//     narration (and every other string) is unchanged. The §5.4 text-parity
//     test carries the matching fixture rewrite.
//   B3-6 (F18): the artifact root #mission-root is now a <main> landmark and
//     the .a-title line is an <h1> (its title). Class-driven styling is
//     unchanged, so both render identically; only the tag names change (no
//     text change, so parity holds).
//
// GATE (future, kept from the reference's note): reading and the naive run
// are free; decisions, attacks, debrief and checkpoints are paid. The gate
// belongs where the mission unlocks after the naive run (finishDay -> won).
// Nothing rendered here yet.
//
// Host protocol v1 (src/pages/ProblemDetail.tsx) -- the bridge below
// OBSERVES the frozen engine's DOM (the v7 host script's approach: observe,
// never patch) and posts:
//   ready · state {decisions, held, survived, bill} · checkpoint
//   {caused|survived|held} · touched (first deck interaction) · commit
//   {text} · size {h} · anchor {id} | {frame:{top,height}} · reset (the
//   reset button; the host clears the saved design)
// and receives init {commit, decisions, survived, held}. On init with a
// survived saved design the bridge makes the ONE host->mission call that
// mutates engine state -- engine.restore(decisions, survived, held), then
// emitState() -- and is observe-only otherwise. The commit box stays inside
// the artifact (its grammar is frozen); persistence is the host's. The
// reader's skip is in-memory for the page's lifetime (the sandbox has no
// sessionStorage).
//
// Fonts: the fallback mono stack (no runtime JetBrains Mono fetch) -- a
// visual deviation from the reference, recorded in the PR. The .artB root
// drops the reference's page-breakout transform; the host wrapper owns the
// 960px breakout. No overscroll-behavior anywhere: at the frame's edges the
// page scroll must chain (owner ruling).

const WALL = 'ambiguous-failure-under-retry'

// The frame's two layout breakpoints, defined once. The CSS template below
// interpolates these strings and every JS check goes through matchMedia with
// the same string, so CSS and JS can never disagree at a boundary pixel (the
// old CSS "max-width: 700px" and JS "innerWidth < 700" split at exactly 700).
//   PHONE: under 700px -- the vertical stage map (GV), the deck accordion, the
//          phone control row.
//   STACK: under 935px -- the two columns stack. Below that frame width the
//          stage column is under ~470px and the 15/18px stage text would land
//          under the 11/13px on-screen floor (mission stage + card log spec).
const PHONE_MQ = '(max-width: 699.98px)'
const STACK_MQ = '(max-width: 934.98px)'
function mq(q) { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches }

const CSS = `
 :root {
 --art-bg: #08090D; --art-surface: #0F1118; --art-surface-2: #161922;
 --art-border: #1F2333; --art-text: #C8CDD8; --art-muted: #98A1B0; /* legibility: #6B7280 is 3.9:1 on --art-surface; this is 7.2:1 for the 9-10px labels */
 --art-border-interactive: #3a4158; --art-text-bright: #EDEFF3;
 --art-red: #ef4444; --art-amber: #eab308; --art-green: #22c55e;
 --accent-problem: #D946EF; --accent-problem-hover: #E879F9;
 --mono: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace;
 }
 :where(#mission-root) * { margin: 0; padding: 0; box-sizing: border-box; }
 #mission-root button { font-family: inherit; }
 #mission-root b { color: var(--art-text-bright); font-weight: 600; }
 .art-foot { color:var(--art-muted); font-size:10px; margin-top:12px; border-top:1px solid var(--art-border); padding-top:8px; line-height:1.7; }
 .art-foot a { color:var(--art-text); text-decoration:underline; }
 .artB { background:var(--art-bg); color:var(--art-text); border:1px solid var(--art-border); border-radius:14px; padding:14px; margin:0; font-family:var(--mono); font-size:12px; width: 100%; position: relative; }
 .a-eyebrow { color:var(--art-muted); font-size:10px; letter-spacing:2px; }
 /* polish §4: more air under the title; the sentence wraps to two lines
    instead of running the full width; the same 14px gutter to the columns. */
 .a-title { color:var(--art-text-bright); font-size:17px; font-weight:700; margin:3px 0 6px; }
 .a-sub { color:var(--art-muted); font-size:11px; line-height:1.5; max-width:86ch; }
 .mission-grid { margin-top:14px; }

 /* polish §3b: chips are one 3x2 grid at every width, each the same size
    (min-height, not text, sets it); radius 12 so two-line chips stay pills. */
 .evchips { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); grid-auto-rows:1fr; gap:6px; }
 .evchip { min-height:40px; display:flex; align-items:center; justify-content:center; text-align:center; font-size:10px; line-height:1.3; letter-spacing:.6px; color:var(--art-muted); border:1px solid var(--art-border); border-radius:12px; padding:4px 6px; background:var(--art-surface); transition:all .25s; }
 .evchip.now { border-color:var(--art-text); color:var(--art-text-bright); box-shadow:0 0 10px rgba(200,205,216,.2); }
 .evchip.clean { border-color:#22c55e; color:#22c55e; }
 .evchip.hurt { border-color:#ef4444; color:#ef4444; }

 /* B2-8 (F21): min-height = three lines so the box never grows 1->3 lines
    between events and shoves the stage 13-19px. Effective font is 12.5px (a
    later rule overrides the 11.5px here): 3 x 12.5 x 1.55 ~= 58px content +
    16px padding + 2px border ~= 76px (border-box); 77px pins 1-3 lines flat. */
 .narr { background:var(--art-surface-2); border:1px solid var(--art-border); border-radius:8px; padding:8px 12px; min-height:77px; font-size:11.5px; line-height:1.55; }
 .narr b { color:var(--art-text-bright); }
 .narr .tag { color:var(--art-muted); letter-spacing:1px; font-size:10px; }

 /* ===== layout (§1/§2): two columns — the run's OUTPUTS live in the right,
    sticky column (stage + meters + newest card stay in view); the reader's
    ACTIONS live in the left, scrolling column (deck, commit, attacks, debrief).
    Phone collapses to one re-ordered column (§2). ===== */
 /* polish §3e: one 14px gutter -- between the columns, between every block
    in them, and inside the panels. */
 .mission-grid { display:grid; grid-template-columns:minmax(0,47fr) minmax(0,53fr); gap:14px; align-items:start; }
 .col-left, .col-right { display:flex; flex-direction:column; gap:14px; min-width:0; }
 /* top:12px is an in-frame gap: sticky can't reference the host nav across the
    iframe boundary, so the "56px clears the nav" of the spec becomes a small
    internal offset (nav-overlap at the very top is a recorded compromise). The
    frame is a bounded scrollport on desktop (host sets min(content,100dvh-56));
    align-self:start keeps the column at content height so it can stick. */
 .col-right { position:sticky; top:12px; align-self:start; max-height:calc(100dvh - 24px); }
 .col-right .log { flex:1 1 auto; min-height:96px; max-height:none; } /* polish (c): the log, not the stage, gives way on short screens */
 .deck { background:var(--art-surface); border:1px solid var(--art-border); border-radius:10px; padding:14px; }
 #artB[data-cue="deck"] .deck { animation:deckpulse 1.6s ease infinite alternate; }
 @keyframes deckpulse { from { border-color:var(--art-border); } to { border-color:var(--accent-problem); box-shadow:0 0 14px rgba(217,70,239,.18);} }
 .deck-title { color:var(--art-text); font-size:10px; letter-spacing:1.6px; margin-bottom:2px; }
 .deck-sub { color:var(--art-muted); font-size:10px; margin-bottom:10px; }
 .kg { margin-top:12px; padding-top:9px; border-top:1px solid var(--art-border); }
 .kg:first-of-type { margin-top:2px; border-top:none; padding-top:0; }
 .kg .kgl { color:var(--art-muted); font-size:10px; letter-spacing:1px; line-height:1.4; display:flex; align-items:center; gap:6px; }
 .kg .kgl .q { color:var(--art-muted); }
 /* §2/A3: the phone accordion reuses .kg -- a .collapsed class hides the
    options and the header shows the current choice + chevron. Desktop keeps the
    full deck: paintDeck never adds .collapsed at >=700px, and the summary
    choice + chevron are hidden. */
 .kgchoice, .kgchev { display:none; }
 .kg .lockmsg { color:var(--art-muted); font-size:10px; font-style:italic; margin-top:3px; }
 .seg { display:flex; flex-direction:column; gap:5px; margin-top:6px; }
 /* polish §3a: every option button is sized by min-height, not its text:
    one-liners all 34px, two-liners grow evenly. */
 .seg button, .lvl .opt { min-height:34px; display:flex; align-items:center; }
 .seg button { text-align:left; padding:6px 9px; border-radius:6px; cursor:pointer; border:1px solid var(--art-border-interactive); color:var(--art-text); background:var(--art-surface); font-family:inherit; font-size:11px; line-height:1.4; }
 .seg button:hover:not(:disabled) { border-color:var(--accent-problem); color:var(--accent-problem-hover); }
 .seg button.sel { border-color:var(--accent-problem); background:rgba(217,70,239,.14); color:var(--accent-problem-hover); font-weight:700; }
 .seg button:disabled { opacity:.5; cursor:not-allowed; }
 .kg.flashg { animation:gflash 1.1s ease 1; }
 @keyframes gflash { 0%,100% { background:transparent; } 35% { background:rgba(217,70,239,.14); border-radius:8px; } }
 .locked .seg button { pointer-events:none; opacity:.7; }

 /* §1: the desktop stage fits its ~508px column (viewBox 640x336 -> ~508x267),
    so no horizontal scroll and no 560px floor. */
 /* polish (c): overflow-x:auto made this a scroll container, so the capped
    sticky column could shrink it below the drawing and hide the bottom of
    the stage. It keeps its height; the log below absorbs the squeeze. */
 .bstagewrap { flex-shrink:0; overflow-x:auto; border-radius:10px; background:radial-gradient(ellipse at 50% 0%, var(--art-surface-2) 0%, var(--art-bg) 70%); border:1px solid var(--art-border); }
 svg#bstage { display:block; width:100%; min-width:0; height:auto; }
 svg#bstage text { font-family:var(--mono); }
 .nodebox { fill:var(--art-surface-2); stroke:var(--art-border); stroke-width:1.4; }
 /* stage text (mission stage + card log spec, owner-approved 15/18): the
    640-wide map draws at 483px on desktop (scale 0.755), so 15 -> 11.3px and
    18 -> 13.6px on screen; the 360-wide phone map draws at ~318px (0.88).
    Every stage text class is one of these; the floor is 11px / 13px titles. */
 .nlab { fill:var(--art-text); font-size:18px; text-anchor:middle; letter-spacing:.5px; font-weight:600; }
 .nsub { fill:var(--art-muted); font-size:15px; text-anchor:middle; }
 .blab { font-size:15px; }
 .wire { stroke:var(--art-border); stroke-width:2; }
 .ghostbox { fill:none; stroke:var(--art-border); stroke-width:1.2; stroke-dasharray:4 3; }
 .memrow { fill:var(--art-text); font-size:15px; }
 .bankrow { fill:var(--art-text); font-size:15px; }
 .bankrow.dbl { fill:#ef4444; font-weight:700; }
 .bankrow.gone { fill:var(--art-muted); text-decoration:line-through; }
 .readptr { stroke:#eab308; stroke-width:1.5; stroke-dasharray:5 3; }
 .sflash { animation:sflash 1.1s ease 1; }
 @keyframes sflash { 0%,100% { opacity:1; } 30% { opacity:.25; } 60% { opacity:1; } }
 .bpulse { animation:bpulse .8s ease infinite alternate; }
 @keyframes bpulse { from { opacity:.55; } to { opacity:1; } }
 @keyframes stampin { from { transform: scale(1.15); } to { transform: scale(1); } }
 .bankrow.stampin { animation: stampin 140ms ease-out; transform-box: fill-box; transform-origin: center; }
 @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
 .shake { animation:shake .35s ease 2; }

 .ctlrow { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
 .runbtn { background:var(--accent-problem); color:var(--art-bg); border:none; border-radius:8px; padding:10px 20px; font-family:inherit; font-size:12.5px; font-weight:700; letter-spacing:.06em; cursor:pointer; }
 .runbtn:hover { background:var(--accent-problem-hover); }
 .runbtn:disabled { opacity:.4; cursor:not-allowed; }
 .bghost { background:none; border:1px solid var(--art-border-interactive); color:var(--art-muted); border-radius:8px; padding:9px 12px; font-family:inherit; font-size:11px; cursor:pointer; }
 .bghost.on { border-color:var(--accent-problem); color:var(--accent-problem-hover); }
 .meters { display:flex; gap:8px; margin-left:auto; }
 .meter { text-align:center; background:var(--art-surface); border:1px solid var(--art-border); border-radius:8px; padding:5px 10px; min-width:64px; }
 .meter .n { font-size:16px; font-weight:700; color:var(--art-muted); }
 .meter .n.bad { color:#ef4444; } .meter .n.good { color:#22c55e; } .meter .n.warn { color:#eab308; }
 .meter .t { font-size:9px; color:var(--art-muted); letter-spacing:.5px; }
 .meternote { flex-basis:100%; text-align:right; font-family:var(--mono); font-size:9px; letter-spacing:.5px; color:var(--art-muted); margin-top:2px; display:none; }
 .meternote.on { display:block; }

 .log { display:grid; gap:8px; max-height:280px; overflow-y:auto; }
 .bcard { border-radius:8px; padding:9px 11px; font-size:11.5px; line-height:1.6; border:1px solid var(--art-border); background:var(--art-surface); }
 .bcard.bad { border-color:#ef4444; background:rgba(239,68,68,.07); }
 .bcard.warn { border-color:#eab308; background:rgba(234,179,8,.07); }
 .bcard.good { border-color:#22c55e; background:rgba(34,197,94,.08); }
 .bcard .code { font-weight:700; }
 .bcard.bad .code { color:#ef4444; } .bcard.warn .code { color:#eab308; } .bcard.good .code { color:#22c55e; }
 .bcard .src { color:var(--art-muted); font-size:10px; margin-top:4px; }
 .bcard .kl { color:var(--accent-problem-hover); cursor:pointer; text-decoration:underline; }

 .esc { margin-top:14px; border-top:1px solid var(--art-border); padding-top:12px; }
 .esc-head { color:var(--art-muted); font-size:10px; letter-spacing:1.2px; }
 .lvl { background:var(--art-surface-2); border:1px solid var(--art-border); border-radius:8px; padding:11px 12px; margin-top:8px; }
 .lvl.locked2 { opacity:.5; pointer-events:none; }
 .lvl .lt { color:var(--art-text-bright); font-size:12px; font-weight:700; }
 .lvl .lq { margin-top:4px; font-size:11.5px; line-height:1.6; color:var(--art-text); }
 .lvl .opt { width:100%; text-align:left; padding:6px 9px; margin-top:6px; border-radius:6px; cursor:pointer; border:1px solid var(--art-border-interactive); color:var(--art-text); background:var(--art-surface); font-family:inherit; font-size:11px; }
 .lvl .opt:hover { border-color:var(--accent-problem); }
 .lvl .done { color:#22c55e; font-weight:700; font-size:11px; display:none; }
 .lvl .verdict { margin-top:8px; padding:8px 10px; border-radius:6px; font-size:11px; line-height:1.6; display:none; }
 .lvl .verdict.on { display:block; }
 .lvl .verdict.good { border:1px solid #22c55e; background:rgba(34,197,94,.08); }
 .lvl .verdict.bad { border:1px solid #ef4444; background:rgba(239,68,68,.08); }
 .lvl .watch { color:var(--accent-problem); font-size:10px; letter-spacing:1px; cursor:pointer; text-decoration:underline; }
 .debrief { margin-top:12px; border:1px solid #22c55e; background:rgba(34,197,94,.06); border-radius:8px; padding:12px 14px; font-size:11.5px; line-height:1.75; display:none; }
 .debrief.on { display:block; }
 .debrief .dt { color:#22c55e; font-weight:700; letter-spacing:1px; font-size:10.5px; }

 #artB[data-cue="run"] .runbtn { animation: runpulse 1.4s ease infinite alternate; }
 @keyframes runpulse { from { box-shadow: 0 0 0 rgba(217,70,239,0); } to { box-shadow: 0 0 18px rgba(217,70,239,.55); } }
 @media ${STACK_MQ} {
 .bstagewrap { overflow-x: visible; }
 /* §1/§2: one natural-height column, re-ordered to the reading order:
    narration -> stage -> controls -> log -> bill -> commit -> deck -> attacks
    -> debrief (evchips lead the right column). The control row is NOT sticky
    (the stage is directly above; sticky would cover the log the cards land in).
    Applies on phones and on any frame too narrow for two readable columns. */
 .mission-grid { display:flex; flex-direction:column; gap:14px; align-items:stretch; } /* the desktop grid's align-items:start let the nowrap .kgchoice size the column past the frame */
 .col-right { position:static; max-height:none; order:-1; align-self:stretch; } /* the desktop align-self:start would shrink it to its content */
 .col-right .log { flex:0 1 auto; min-height:0; max-height:280px; }
 #bill { order:1; }        /* right column: log before bill when stacked */
 #cmtbox { order:-1; }     /* left column: commit before deck when stacked */
 }
 @media ${PHONE_MQ} {
 /* the vertical map is tall (360x632): cap its width so a 600-699px frame
    doesn't draw a 930px-tall stage; 390-class phones are unaffected. */
 svg#bstage { max-width:420px; margin:0 auto; }
 /* control row: buttons one line (RUN flexes), meters a second full-width
    3-col line, never clipped (F11's "MYS"). */
 .runbtn { flex:1 1 auto; }
 #stepbtn, #resetbtn { flex:0 0 auto; }
 .meters { flex-basis:100%; margin-left:0; display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
 .meter { min-width:0; }
 /* phone accordion (A3): 44px rows, one open at a time. The base .kgl is
    already flex; the choice is pushed right (label 1fr, choice auto, chevron)
    -- flex not grid so the label + .q keep the reference's innerText. */
 .kg .kgl { min-height:44px; padding:10px 12px; cursor:pointer; }
 .kg .kgchoice { display:block; margin-left:auto; max-width:55%; font-size:12px; color:var(--art-text-bright); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
 .kg .kgchev { display:block; width:18px; text-align:center; color:var(--art-muted); }
 .kg:not(.collapsed) .kgchoice { display:none; }
 .kg.collapsed .seg, .kg.collapsed .lockmsg { display:none; }
 }
 @media (prefers-reduced-motion: reduce) {
 #artB[data-cue="deck"] .deck, #artB[data-cue="run"] .runbtn, #artB[data-cue="group"] .kg.cue-target, .bpulse, .shake { animation: none !important; }
 .averdict { transition: none !important; transform: none !important; }
 /* B2-11 (F24): one rule, one state - under reduced motion STEP is the
    control that works, so it is the promoted (outlined) button and RUN drops
    to the ghost style; two primaries no longer compete. */
 #artB .runbtn { background:none; border:1px solid var(--art-border-interactive); color:var(--art-muted); font-weight:600; }
 #artB .runbtn:hover { background:none; color:var(--art-text); }
 #artB #stepbtn { border-color:var(--accent-problem); color:var(--accent-problem-hover); }
 }
  .billpanel { background:var(--art-surface); border:1px solid var(--art-border); border-radius:8px; padding:12px 14px; font-size:11.5px; line-height:1.5; }
  .billhead { color:var(--art-muted); font-size:10px; letter-spacing:1.2px; margin-bottom:6px; }
  /* polish §3d: the row divider was --art-surface-2, invisible on the panel */
  .billrow { color:var(--art-text); padding:6px 0; border-top:1px solid var(--art-border); }
  .billrow.base { color:var(--art-text-bright); }
  .billrow .bl { color:var(--art-muted); font-size:10px; letter-spacing:1px; margin-right:6px; }
  .billrow .bs { color:var(--art-muted); font-size:10px; margin-left:6px; }
  #artB[data-cue="group"] .kg.cue-target { animation:deckpulse 1.6s ease infinite alternate; border-radius:8px; }
  .fixrow { margin-top:8px; }
  .rerunbtn { border-color:var(--accent-problem) !important; color:var(--accent-problem-hover) !important; font-weight:700 !important; }
  details.hints { margin-top:8px; }
  details.hints summary { cursor:pointer; color:var(--art-muted); font-size:10px; letter-spacing:1.2px; list-style:none; }
  details.hints summary::-webkit-details-marker { display:none; }
  .bcard .khint { color:var(--art-muted); }
 .debrief, .narr, .lvl .lq, #cmt-locked { font-size: 12.5px; max-width: 68ch; }
 .esc-head .esc-rest { font-size: 11.5px; letter-spacing: 0.2px; }
 .kgl .addtag { color: var(--art-amber); font-size: 10px; letter-spacing: 1px; margin-left: 6px; }
`

const MARKUP = `
<main id="mission-root">
<div class="artB" id="artB" data-cue="run">
 <div class="a-eyebrow">AMBIGUOUS FAILURE UNDER RETRY</div>
 <h1 class="a-title">The defense loop <span style="font-size:9px;letter-spacing:1.5px;border:1px solid #D946EF;color:#E879F9;border-radius:5px;padding:2px 7px;vertical-align:2px;font-weight:400;">BUILD IT</span></h1>
 <div class="a-sub">You own this payment path. Make your six decisions below, then run the day. Surviving the day means zero double charges, zero lost sales, zero unresolved payments.</div>

 <div class="mission-grid">
  <div class="col-left">
   <div class="deck" id="deck" aria-label="Your six design decisions"></div>

   <div class="billpanel" id="cmtbox" style="display:none;">
    <div class="billhead">BEFORE YOU READ ANYONE'S ANSWER</div>
    <div id="cmt-ask">
     <div style="color:#C8CDD8;margin-bottom:6px;">In one sentence: why this design?</div>
     <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <input id="cmt-input" maxlength="200" style="flex:1;min-width:200px;background:#0F1118;border:1px solid var(--art-border-interactive);border-radius:6px;color:var(--art-text);font-family:inherit;font-size:11px;padding:7px 9px;" aria-label="Why this design, in one sentence">
      <button class="bghost" id="cmt-lock" style="border-color:#D946EF;color:#E879F9;">Lock it in</button>
      <button class="bghost" id="cmt-skip" style="border:none;text-decoration:underline;">Skip</button>
     </div>
    </div>
    <div id="cmt-locked" style="display:none;color:#C8CDD8;"></div>
   </div>

   <div class="esc" id="escwrap" style="display:none;">
    <div class="esc-head"><span class="esc-lede">FIVE ATTACKS</span><span class="esc-rest">: YOUR DESIGN SURVIVED A DAY. EACH ATTACK FLIPS ONE OF YOUR DECISIONS, OR ADDS ONE YOU HADN'T MADE. FIX IT WITH YOUR DECISIONS, THEN RE-RUN THE ATTACK. (ATTACK 1 IS THE EXCEPTION, AND SAYS SO.)</span></div>
    <div id="lvls"></div>
    <div class="debrief" id="debrief"></div>
   </div>
  </div>

  <div class="col-right">
   <div class="evchips" id="evchips"></div>
   <div class="narr" id="narr" aria-live="polite"></div>
   <div class="bstagewrap"><svg id="bstage" viewBox="0 0 640 336" role="img" aria-label="Payment path: client, server, bank, and the key's memory; traffic animates across it"></svg></div>
   <div class="ctlrow">
    <button class="runbtn" id="runbtn">RUN THE DAY (NAIVE) ▶</button>
    <button class="bghost" id="stepbtn">STEP</button>
    <button class="bghost" id="resetbtn">reset</button>
    <div class="meters">
    <div class="meter"><div class="n" id="m-dbl">-</div><div class="t">DOUBLES</div></div>
    <div class="meter"><div class="n" id="m-lost">-</div><div class="t">LOST SALES</div></div>
    <div class="meter"><div class="n" id="m-tick">-</div><div class="t">MYSTERY</div></div>
    </div>
    <div class="meternote" id="meternote"></div>
   </div>
   <div class="billpanel" id="bill" style="display:none;"></div>
   <div class="log" id="log"></div>
  </div>
 </div>


 </div>
 <div class="art-foot" id="mission-foot" style="display:none;"><a href="https://www.behindscale.com/problems/ambiguous-timeouts">From the full problem page at behindscale.com →</a></div>
</main>
`

// ---- the frozen engine (problem-page-v7.3.html, Script 2) ----------------
function bootEngine() {
 'use strict';
 var $ = function(s){ return document.querySelector(s); };
 var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
 var NS = 'http://www.w3.org/2000/svg';
 var K = { id:'none', mem:'none', read:'master', cli:'blind', rep:'err', ret:'day' };
  var ROWS_ADDED = { params:false, after:false };
    var FREE = false; /* FREE PLAY is prototype-only and not ported; the sequence gates below stay verbatim */
 var speed = 1, curEv = -1, running = false, won = false, evIdx = 0, dayDamage = null, touched = false, runsDone = 0;
 var attackDbl = 0, anyAttackRun = false; /* B2-4: attack damage counted into the meters + the "today + attacks" note */
 var dwellUntil = 0;
 var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var lvlDone = [false,false,false,false,false];
 /* §2/A3: phone accordion state -- which deck group is open (one at a time).
    paintDeck reads it on phones; desktop ignores it (full deck). Attack-added
    rows set it to themselves on arrival; "-> the decision" sets it to the
    card's group. */
 var openGroup = 'id';

 /* dayTokens(): the RULES block, imported from ./problem-ambiguous-timeouts-rules.js (verbatim, frozen). */

 /* ---------- deck ---------- */
 var GROUPS = [
 { k:'id', label:'IDENTITY: who names the request?', opts:[
  ['none','Nobody: a request is just its parameters'],
  ['hash','Server: hashes the request parameters'],
  ['key','Client: generates and sends an idempotency key']] },
 { k:'mem', label:'MEMORY: how the server remembers a request it already handled', needs:function(){return K.id!=='none';}, lock:'memory needs a name: set identity first', opts:[
  ['none','Nowhere: keep no record'],
  ['store','A separate store, written after the charge'],
  ['storerec','A separate store that also tracks how far the charge got, so a retry can resume'],
  ['acid','Committed together with the charge, in one transaction']] },
 { k:'read', label:'READS: which copy the server checks for the key', needs:function(){return K.mem!=='none';}, lock:'needs a memory to read', opts:[
  ['master','The main database, where the record was written'],
  ['replica','A read-only copy: cheaper, but seconds behind']] },
 { k:'cli', label:'ON A TIMEOUT: the client…', opts:[
  ['giveup','Gives up, assuming the charge failed'],
  ['blind','Retries with no key, so the server can\'t recognize it'],
  ['key','Retries with the same idempotency key']],
  optNeeds:{ key:function(){return K.id!=='none';} } },
 { k:'rep', label:'REPLY: when the server sees a repeat, it sends back…', needs:function(){return K.mem!=='none';}, lock:'needs a memory first: without one, the server can\'t tell it\'s a repeat', opts:[
  ['err','An error that says "this was already done"'],
  ['saved','Return the original saved response']] },
 { k:'ret', label:'WINDOW: how long the key store remembers each idempotency key', needs:function(){return K.mem!=='none';}, lock:'needs a memory to keep', opts:[
  ['min','One minute'],
  ['day','About 24 hours'],
  ['size','Limited by size: drop the oldest keys when full, and alert an engineer if keys start expiring in under a day'],
  ['ever','Forever']] },
 { k:'params', q:'', label:'SAME KEY, NEW PARAMS: the server…', needs:function(){return ROWS_ADDED.params;}, lock:'', hideLocked:true, opts:[
  ['run','Runs it: the parameters are the request'],
  ['replay','Returns the old response'],
  ['refuse','Refuses, with a validation error naming the mismatch']] },
 { k:'after', q:'', label:'AFTER THE WINDOW: stragglers are…', needs:function(){return ROWS_ADDED.after;}, lock:'', hideLocked:true, opts:[
  ['nothing','Nobody\'s problem: the window is the guarantee'],
  ['reconcile','Caught by a reconciliation sweep against the bank\'s records']] }
 ];
 var STAGEMAP = { id:'sg-id', mem:'sg-mem', read:'sg-read', cli:'sg-cli', rep:'sg-rep', ret:'sg-ret' };

 function paintDeck(){
 var vert = mq(PHONE_MQ); /* §2/A3: phone shows a one-open accordion; desktop the full deck */
 var h = '<div class="deck-title">YOUR DECISIONS</div><div class="deck-sub">the day runs on the choices you make here</div>';
 GROUPS.forEach(function(g){
  var ok = !g.needs || g.needs();
  if (!ok && g.hideLocked) return;
  var collapsed = vert && openGroup !== g.k;
  var chosen = '';
  if (ok){ for (var ci=0;ci<g.opts.length;ci++){ if (K[g.k]===g.opts[ci][0]){ chosen=g.opts[ci][1]; break; } } }
  /* label + .q stay as the reference has them (raw text + span) so innerText
     parity holds; the choice + chevron are extra spans, hidden on desktop. */
  h += '<div class="kg'+(collapsed?' collapsed':'')+'" id="kg-'+g.k+'">'+
   '<div class="kgl" data-acc="'+g.k+'"'+(vert?' role="button" tabindex="0" aria-expanded="'+(collapsed?'false':'true')+'"':'')+'>'+
    g.label+(g.q?' <span class="q">'+g.q+'</span>':'')+
    '<span class="kgchoice">'+chosen+'</span>'+
    '<span class="kgchev" aria-hidden="true">'+(collapsed?'▾':'▴')+'</span>'+
   '</div>';
  if (!ok) h += '<div class="lockmsg">&#128274; '+g.lock+'</div>';
  h += '<div class="seg">';
  g.opts.forEach(function(o){
  var dis = !ok || (g.optNeeds && g.optNeeds[o[0]] && !g.optNeeds[o[0]]());
  h += '<button data-k="'+g.k+'" data-v="'+o[0]+'" '+(dis?'disabled':'')+' class="'+(K[g.k]===o[0]?'sel':'')+'">'+o[1]+'</button>';
  });
  h += '</div></div>';
 });
 $('#deck').innerHTML = h;
 if (escMode>=0 && LEVELS[escMode] && LEVELS[escMode].group){ var gk=document.getElementById('kg-'+LEVELS[escMode].group); if(gk) gk.classList.add('cue-target'); }
 $$('#deck button[data-k]').forEach(function(b){
  b.addEventListener('click', function(){
  if (running || b.disabled) return;
  touched = true; if($('#artB').dataset.cue==='deck') $('#artB').dataset.cue='';
  K[b.dataset.k] = b.dataset.v;
  if (K.id==='none'){ K.mem='none'; if (K.cli==='key') K.cli='blind'; }
  if (K.mem==='none'){ K.read='master'; }
  paintDeck(); drawStage();
  var sg = document.getElementById(STAGEMAP[b.dataset.k]);
  if (sg){ sg.classList.remove('sflash'); void sg.getBoundingClientRect(); sg.classList.add('sflash'); }
  var kg = document.getElementById('kg-'+b.dataset.k);
  if (!kg.classList.contains('cue-target')){ kg.classList.remove('flashg'); void kg.offsetWidth; kg.classList.add('flashg'); }
  focusDeckSel(b.dataset.k); /* B2-7 (F17): paintDeck() rebuilt the deck - keep focus on the chosen option */
  });
 });
 /* §2/A3: accordion toggle on the group header (phone only; desktop = full deck) */
 $$('#deck .kgl[data-acc]').forEach(function(hd){
  function toggle(){ if (!mq(PHONE_MQ)) return; var k=hd.getAttribute('data-acc'); openGroup = (openGroup===k) ? null : k; paintDeck(); }
  hd.addEventListener('click', toggle);
  hd.addEventListener('keydown', function(e){ if (e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
 });
 }
 /* B2-7 (F17): focus the selected option of a deck group after a repaint, so
    keyboard focus survives the deck rebuild (and lands on a newly added
    attack row's default option). */
 function focusDeckSel(k){ var nb=document.querySelector('#deck button[data-k="'+k+'"].sel'); if(nb && nb.focus) nb.focus(); }

 /* ---------- stage geometry (fixed bands, nothing floats) ---------- */
 var GH = {
 /* mission stage + card log spec (2026-09-30), corrected by the stage checker:
    text is authored at 15px (18px node titles) so it lands at >=11/13px on the
    483px desktop stage (scale 0.755). wireY stays 132 and every node stays
    centred on it, so the dots travel the same lines. Label positions that
    used to be code constants are data here (idLab, readLab, storeCap,
    clockLab, bankRows, memText). */
 vb:'0 0 640 336',
 client:{x:12,y:104,w:130,h:56}, server:{x:262,y:104,w:130,h:56}, bank:{x:444,y:60,w:192,h:140},
 wireY:132, idDot:{cx:202,cy:132}, repNote:{x:170,y:70},
 idLab:{dx:0,dy:24,anchor:'middle'},
 memNone:{x:272,y:214,w:110,h:36}, memStore:{x:262,y:170,w:180,h:84}, memAcid:{x:262,y:170,w:180,h:84},
 replica:{x:20,y:212,w:196,h:46}, clock:{cx:548,cy:228},
 readLab:{x:254,y:190,anchor:'end'},                 /* left of the server's drop line */
 storeCap:{x:350,y:272,anchor:'middle',maxW:300},    /* "written after the charge", under the store */
 clockLab:{dx:0,dy:28,anchor:'middle',maxW:180},
 bankRows:{first:50,pitch:20,maxLines:5},            /* newest rows + "+N earlier"; a wrapped row counts per line */
 memText:{title:19,first:38,pitch:19,maxLines:3},
 /* §3 (F9): transient labels never render inside a node rect -- each takes a
    band slot. rows = the two y-slots (1st/2nd label of an event); xslots snap
    to the nearest zone (client/server/bank on top, memory/store on bottom). */
 bands: { top:{rows:[24,46],xslots:[88,327,547]}, bottom:{rows:[312,330],xslots:[327,470]} }
 };
 /* vertical G-map for phones: client -> server -> bank flows top-to-bottom */
 var GV = {
 /* 360 wide, grown 552 -> 632 tall: at 15px text the phone map needs a
    full-width memory box (the long attack-3 notes wrap to 2-3 lines), its own
    row for the read-only copy and the clock, and two memory-band rows. */
 vb:'0 0 360 632',
 client:{x:90,y:12,w:180,h:56}, server:{x:90,y:200,w:180,h:56}, bank:{x:70,y:470,w:220,h:118},
 wireX:180, wireY:0, idDot:{cx:180,cy:120}, repNote:{x:180,y:168},
 idLab:{dx:14,dy:5,anchor:'start'},                  /* beside the dot, clear of the wire band rows */
 memNone:{x:190,y:290,w:130,h:40}, memStore:{x:40,y:290,w:280,h:80}, memAcid:{x:40,y:266,w:280,h:80},
 replica:{x:186,y:380,w:170,h:46}, clock:{cx:26,cy:392},
 readLab:null,                                       /* the read state is carried by the pointer line alone */
 storeCap:{x:180,y:283,anchor:'middle',maxW:300},    /* "written after the charge", above the store */
 clockLab:{dx:20,dy:5,anchor:'start',maxW:120},
 bankRows:{first:48,pitch:18,maxLines:4},
 memText:{title:18,first:36,pitch:18,maxLines:3},
 /* §3 (F9): wire dodges idDot cy=120; two memory-band rows sit between the
    copy's bottom (426) and the bank's top (470); the bank band under it. */
 bands: { wire:{rows:[96,148],xslots:[180]}, memory:{rows:[441,458],xslots:[180]}, bank:{rows:[604,621],xslots:[180]} }
 };
 var VERT = false, G = GH;
 var stage = $('#bstage'), layerStatic, layerAnim;
 function el(name, attrs, parent, text){
 var e = document.createElementNS(NS, name);
 for (var k in attrs) e.setAttribute(k, attrs[k]);
 /* the .nsub class sets text-anchor:middle in CSS, which beats the attribute,
    so an explicit anchor is also set as a style (start/end labels used to be
    silently centred) */
 if (attrs['text-anchor']) e.style.textAnchor = attrs['text-anchor'];
 if (text !== undefined) e.textContent = text;
 (parent||stage).appendChild(e); return e;
 }
 function memRect(){ return K.mem==='acid' ? G.memAcid : G.memStore; }
 /* Stage text is 15/18px (>=11/13px on screen), so a few strings no longer
    fit their box on one line. wrapText splits a <text> into tspans that fit
    maxW, preferring the " · " breaks the strings already carry, then spaces.
    Returns the line count. No-op where text can't be measured (jsdom). */
 function wrapText(t, maxW, lineH){
  var txt = t.textContent; if (!txt || !t.getComputedTextLength || !maxW) return 1;
  if (t.getComputedTextLength() <= maxW) return 1;
  var parts = txt.split(' ');
  var x = t.getAttribute('x'), lines = [], cur = '';
  t.textContent = '';
  var probe = document.createElementNS(NS, 'tspan'); t.appendChild(probe);
  parts.forEach(function(p){
   var cand = cur ? cur+' '+p : p; probe.textContent = cand;
   if (cur && t.getComputedTextLength() > maxW){ lines.push(cur); cur = p; } else cur = cand;
  });
  if (cur) lines.push(cur);
  t.removeChild(probe);
  lines.forEach(function(l, i){ var ts = document.createElementNS(NS, 'tspan'); ts.setAttribute('x', x); if (i) ts.setAttribute('dy', lineH); ts.textContent = l; t.appendChild(ts); });
  return lines.length;
 }
 /* a transient band label never leaves the canvas (long replies on an edge slot) */
 function clampLabel(t){
  if (!t.getComputedTextLength) return t;
  var W = VERT ? 360 : 640, w = t.getComputedTextLength(), x = +t.getAttribute('x');
  var a = t.getAttribute('text-anchor') || 'middle', left = a==='middle' ? x-w/2 : a==='end' ? x-w : x;
  if (left < 6) t.setAttribute('x', x + (6-left)); else if (left+w > W-6) t.setAttribute('x', x - (left+w-(W-6)));
  return t;
 }
 function bandText(p, fill, txt, parent){ return clampLabel(el('text',{class:'blab',x:p.x,y:p.y,'text-anchor':p.anchor,fill:fill}, parent||layerAnim, txt)); }

 var bankEntries = [];
 function renderBank(){
 var host = document.getElementById('bBankrows'); if(!host) return;
 host.innerHTML='';
 var BR = G.bankRows, MAX = 3, maxW = G.bank.w-24;
 /* draw newest-first into a scratch group to learn each row's line count,
    keep as many as fit (reserving a line for "+N earlier"), then lay out */
 var keep = [], used = 0;
 for (var i = bankEntries.length-1; i >= 0 && keep.length < MAX; i--){
  var probe = el('text',{class:'bankrow',x:G.bank.x+12,y:0},host,bankEntries[i].txt);
  var n = wrapText(probe, maxW, BR.pitch); host.removeChild(probe);
  var reserve = i > 0 ? 1 : 0;
  if (used + n + reserve > BR.maxLines) break;
  keep.unshift({r:bankEntries[i], n:n}); used += n;
 }
 var extra = bankEntries.length - keep.length;
 var y = G.bank.y+BR.first;
 if (extra>0){ el('text',{class:'bankrow',x:G.bank.x+12,y:y,fill:'#6B7280'},host,'+'+extra+' earlier'); y+=BR.pitch; }
 keep.forEach(function(k){
  var r = k.r, t = el('text',{class:'bankrow '+(r.cls||'')+(r._new?' stampin':''),x:G.bank.x+12,y:y},host,r.txt);
  y += BR.pitch * wrapText(t, maxW, BR.pitch);
  r._el = t; r._new = false;
 });
 }
 function bankStamp(txt, cls){
 bankEntries.push({txt:txt, cls:cls||'', _new:true});
 renderBank();
 if (cls==='dbl') dwellUntil = Date.now() + 900; /* R3: dwell is real time, never /speed */
 if (cls==='dbl'){ var b=$('#bankbox'); b.classList.add('shake'); setTimeout(function(){b.classList.remove('shake');},900); }
 if (cls==='dbl' && curLvl>0) bumpAttackDouble(); /* B2-4: a double stamped during an attack counts in the meters */
 return bankEntries[bankEntries.length-1];
 }
 function bankAmend(entry, txt, cls){ entry.txt=txt; entry.cls=cls; renderBank(); }

 function drawStage(){
 stage.innerHTML='';
 layerStatic = el('g',{});
 layerAnim = el('g',{});
 var S = layerStatic;
 if (!VERT){
  el('line',{class:'wire',x1:G.client.x+G.client.w,y1:G.wireY,x2:G.server.x,y2:G.wireY},S);
  el('line',{class:'wire',x1:G.server.x+G.server.w,y1:G.wireY,x2:G.bank.x,y2:G.wireY},S);
 } else {
  el('line',{class:'wire',x1:GV.wireX,y1:G.client.y+G.client.h,x2:GV.wireX,y2:G.server.y},S);
  el('line',{class:'wire',x1:GV.wireX,y1:G.server.y+G.server.h,x2:GV.wireX,y2:G.bank.y},S);
 }

 /* client + policy inside the box */
 var gCli = el('g',{id:'sg-cli'},S);
 el('rect',{class:'nodebox',x:G.client.x,y:G.client.y,width:G.client.w,height:G.client.h,rx:8},gCli);
 el('text',{class:'nlab',x:G.client.x+G.client.w/2,y:G.client.y+G.client.h/2+6},gCli,'CLIENT'); /* the policy sublabel repeated the deck */

 /* identity dot ON the wire, label BELOW the wire */
 var gId = el('g',{id:'sg-id'},S);
 if (K.id==='none') el('circle',{cx:G.idDot.cx,cy:G.idDot.cy,r:8,fill:'#08090D',stroke:'#6B7280','stroke-dasharray':'3 2.4','stroke-width':1.6},gId);
 if (K.id==='key') el('circle',{cx:G.idDot.cx,cy:G.idDot.cy,r:8,fill:'#B45309'},gId);
 if (K.id==='hash'){ el('circle',{cx:G.idDot.cx,cy:G.idDot.cy,r:8,fill:'#0891B2'},gId); el('text',{x:G.idDot.cx,y:G.idDot.cy+3.5,'text-anchor':'middle','font-size':'10',fill:'#08090D','font-weight':'700'},gId,'#'); }
 el('text',{class:'nsub',x:G.idDot.cx+G.idLab.dx,y:G.idDot.cy+G.idLab.dy,'text-anchor':G.idLab.anchor},gId,{none:'no identity',hash:'request hash',key:'caller key'}[K.id]);

 /* reply annotation in the reserved top band */
 if (K.mem!=='none'){
  var gRep = el('g',{id:'sg-rep'},S);
  el('text',{class:'nsub',x:G.repNote.x,y:G.repNote.y},gRep,'duplicate reply:');
  el('text',{class:'nsub',x:G.repNote.x,y:G.repNote.y+17,fill:'#C8CDD8'},gRep,K.rep==='err'?'"ERROR: already processed"':'the saved result');
 }

 /* server */
 el('rect',{class:'nodebox',id:'serverbox',x:G.server.x,y:G.server.y,width:G.server.w,height:G.server.h,rx:8},S);
 el('text',{class:'nlab',x:G.server.x+G.server.w/2,y:G.server.y+G.server.h/2+6},S,'SERVER'); /* "charges the bank" repeated the node's position */

 /* bank */
 el('rect',{class:'nodebox',id:'bankbox',x:G.bank.x,y:G.bank.y,width:G.bank.w,height:G.bank.h,rx:8},S);
 el('text',{class:'nlab',x:G.bank.x+G.bank.w/2,y:G.bank.y+26},S,'BANK LEDGER');
 el('g',{id:'bBankrows'},S);
 renderBank();

 /* memory */
 var gMem = el('g',{id:'sg-mem'},S);
 if (K.mem==='none'){
  el('rect',{class:'ghostbox',x:G.memNone.x,y:G.memNone.y,width:G.memNone.w,height:G.memNone.h,rx:7},gMem);
  el('text',{class:'nsub',x:G.memNone.x+G.memNone.w/2,y:G.memNone.y+G.memNone.h/2+5,fill:'#6B7280'},gMem,'NO MEMORY');
 } else if (K.mem==='store'){
  var m=G.memStore;
  el('line',{class:'wire',x1:G.server.x+G.server.w-16,y1:G.server.y+G.server.h,x2:m.x+26,y2:m.y},gMem);
  var cap = el('text',{class:'nsub',x:G.storeCap.x,y:G.storeCap.y,'text-anchor':G.storeCap.anchor},gMem,'written after the charge');
  wrapText(cap, G.storeCap.maxW, 17);
  el('rect',{class:'nodebox',x:m.x,y:m.y,width:m.w,height:m.h,rx:7},gMem);
  el('text',{class:'nsub',x:m.x+m.w/2,y:m.y+G.memText.title,fill:'#C8CDD8'},gMem,'KEY STORE');
  el('text',{class:'memrow',x:m.x+10,y:m.y+G.memText.first,id:'memrow'},gMem,'');
 } else {
  var a=G.memAcid;
  el('rect',{class:'nodebox',x:a.x,y:a.y,width:a.w,height:a.h,rx:7,'stroke-width':2.2},gMem);
  el('text',{class:'nsub',x:a.x+a.w/2,y:a.y+G.memText.title,fill:'#C8CDD8'},gMem,'MEMORY + CHARGE');
  el('text',{class:'memrow',x:a.x+10,y:a.y+G.memText.first,id:'memrow'},gMem,'one commit');
 }

 if (K.mem!=='none'){
  /* read pointer + replica */
  var gRead = el('g',{id:'sg-read'},S);
  var m2 = memRect();
  var tx = K.read==='master' ? {x:m2.x+m2.w/2,y:m2.y+(K.mem==='acid'?m2.h:0)} : {x:G.replica.x+G.replica.w/2,y:G.replica.y};
  el('line',{class:'readptr',id:'readline',x1:G.server.x+24,y1:G.server.y+G.server.h,x2:tx.x-16,y2:tx.y+4},gRead);
  if (G.readLab) el('text',{class:'nsub',x:G.readLab.x,y:G.readLab.y,'text-anchor':G.readLab.anchor,fill:'#eab308'},gRead,'reads: '+(K.read==='master'?'main database':'read-only copy'));
  el('rect',{class:'ghostbox',x:G.replica.x,y:G.replica.y,width:G.replica.w,height:G.replica.h,rx:7,id:'replicabox'},S);
  el('text',{class:'nsub',x:G.replica.x+G.replica.w/2,y:G.replica.y+G.replica.h/2-2},S,'READ-ONLY COPY');
  el('text',{class:'nsub',x:G.replica.x+G.replica.w/2,y:G.replica.y+G.replica.h/2+15,id:'replicanote'},S,'seconds behind');
  /* clock */
  var gRet = el('g',{id:'sg-ret'},S);
  el('circle',{cx:G.clock.cx,cy:G.clock.cy,r:12,fill:'none',stroke:'#8A8A94','stroke-width':1.4},gRet);
  el('line',{x1:G.clock.cx,y1:G.clock.cy,x2:G.clock.cx,y2:G.clock.cy-8,stroke:'#8A8A94','stroke-width':1.4,id:'clockhand'},gRet);
  var keeps = el('text',{class:'nsub',x:G.clock.cx+G.clockLab.dx,y:G.clock.cy+G.clockLab.dy,'text-anchor':G.clockLab.anchor},gRet,'keeps: '+({min:'1 min',day:'~24 h',size:'size-bound',ever:'forever'}[K.ret]));
  wrapText(keeps, G.clockLab.maxW, 17);
 }
 }
 function memNote(txt){ var m=document.getElementById('memrow'); if(!m) return; m.textContent = txt; var r = memRect(); wrapText(m, r.w-18, G.memText.pitch); }

 /* ---------- animation primitives ---------- */
 function sleep(ms){
 var wait = REDUCED ? Math.min(ms, 300) : ms/speed; /* R18: reduced beats are not speed-divided */
 wait = Math.max(wait, dwellUntil - Date.now()); /* R3: double-charge stamps hold their dwell */
 return new Promise(function(r){ setTimeout(r, wait); }); }
 function dot(x,y,kind){
 var g = el('g',{},layerAnim);
 el('circle',{cx:0,cy:0,r:7,fill: kind==='reply'?'#22c55e': kind==='err'?'#ef4444':'#C8CDD8', stroke: kind==='key'?'#B45309': kind==='hash'?'#0891B2':'none','stroke-width':3},g);
 if(kind==='hash') el('text',{x:0,y:3.5,'text-anchor':'middle','font-size':'9',fill:'#08090D','font-weight':'700'},g,'#');
 g.setAttribute('transform','translate('+x+','+y+')'); g._x=x; g._y=y;
 return g;
 }
 function move(d,x2,y2,ms){
 return new Promise(function(res){
  if (REDUCED){ d.setAttribute('transform','translate('+x2+','+y2+')'); d._x=x2; d._y=y2; return res(); }
  var x1=d._x,y1=d._y,t0=null;
  function f(t){ if(!t0)t0=t; var p=Math.min(1,(t-t0)/(ms/speed)); var e=p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
  d.setAttribute('transform','translate('+(x1+(x2-x1)*e)+','+(y1+(y2-y1)*e)+')');
  if(p<1) requestAnimationFrame(f); else { d._x=x2; d._y=y2; res(); } }
  requestAnimationFrame(f);
 });
 }
 function kill(d, label){
 var x=d._x,y=d._y; d.remove();
 var g=el('g',{},layerAnim);
 el('line',{x1:x-7,y1:y-7,x2:x+7,y2:y+7,stroke:'#ef4444','stroke-width':2.5,'stroke-linecap':'round'},g);
 el('line',{x1:x+7,y1:y-7,x2:x-7,y2:y+7,stroke:'#ef4444','stroke-width':2.5,'stroke-linecap':'round'},g);
 if(label){ bandText(placeLabel('wire', x), '#ef4444', label, g); } /* §3: label in the wire band, never over a box (the X stays on the wire) */
 setTimeout(function(){ g.style.transition='opacity 1s'; g.style.opacity=0; }, Math.max(800, 1400/speed));
 return sleep(500);
 }
 function say(tag, html){ $('#narr').innerHTML = '<span class="tag">'+tag+'</span> · '+html; }
 /* §3 (F9): every transient stage label goes through here -- it never lands in
    a node rect. kind is the logical zone ('wire'|'memory'|'bank'); it maps to
    the current map's band (GH: wire->top, memory/bank->bottom; GV: same names).
    The nth label of the current event in a zone takes the nth row (1st/2nd);
    x snaps to the nearest zone x-slot. Reset per event by resetLabelSlots(). */
 var labelSlots = {};
 function resetLabelSlots(){ labelSlots = {}; stage.querySelectorAll('text.blab').forEach(function(n){ n.remove(); }); } /* a new event/attack starts on a clear band: the last event's fading labels would otherwise sit under this one's */
 function placeLabel(kind, naturalX){
  var bands = G.bands || {};
  var zone = VERT ? kind : (kind === 'wire' ? 'top' : 'bottom');
  var b = bands[zone];
  if (!b){ return { x:naturalX, y:24, anchor:'middle' }; }
  var n = labelSlots[zone] || 0; labelSlots[zone] = n + 1;
  var y = b.rows[Math.min(n, b.rows.length - 1)];
  var xs = b.xslots, x = xs[0], best = Infinity;
  for (var i=0;i<xs.length;i++){ var dd = Math.abs(xs[i]-naturalX); if (dd<best){ best=dd; x=xs[i]; } }
  return { x:x, y:y, anchor:'middle' };
 }
 function flashServer(color){
 var b=$('#serverbox'); b.setAttribute('stroke',color); b.classList.add('bpulse');
 return sleep(700).then(function(){ b.classList.remove('bpulse'); b.setAttribute('stroke','#1F2333'); });
 }
 function checkMemory(found, fromReplica){
 var m2 = fromReplica? G.replica : memRect();
 var yTop = fromReplica? m2.y : (K.mem==='acid'? m2.y+m2.h : m2.y);
 var line = el('line',{x1:G.server.x+34,y1:G.server.y+G.server.h,x2:m2.x+m2.w/2,y2:yTop,stroke: found?'#22c55e':'#ef4444','stroke-width':2,'stroke-dasharray':'4 3'},layerAnim);
 var p = placeLabel('memory', m2.x+m2.w/2); /* \u00a73: memory band, not beside the box */
 var lbl = bandText(p, found?'#22c55e':'#ef4444', found?'seen it \u2713':'never seen');
 setTimeout(function(){ line.remove(); lbl.remove(); }, 1600/speed);
 return sleep(650);
 }

 var CX,SX,SXR,BX,Y;
 function refreshXY(){ CX=G.client.x+G.client.w; SX=G.server.x; SXR=G.server.x+G.server.w; BX=G.bank.x; Y=G.wireY; }
 function pickG(){ VERT = mq(PHONE_MQ); G = VERT ? GV : GH; refreshXY(); stage.setAttribute('viewBox', G.vb); } /* §3: GV grows 520->552 for the bank band */
 pickG();
 window.addEventListener('resize', function(){ var v = mq(PHONE_MQ); if (v !== VERT && !running){ pickG(); drawStage(); layerAnim = el('g',{}); paintDeck(); /* §2/A3: repaint the deck so it matches the new breakpoint (accordion vs full) */ } });
 function reqA(){ return VERT ? {x:GV.wireX, y:G.client.y+G.client.h+10} : {x:CX+14, y:Y}; }
 function reqB(){ return VERT ? {x:GV.wireX, y:G.server.y-8} : {x:SX-8, y:Y}; }
 async function animRequest(kind, opts){
 opts = opts||{};
 var a = reqA(), b = reqB();
 var d = dot(a.x, a.y, kind);
 var mid = VERT ? {x:a.x, y:(a.y+b.y)/2} : {x:(CX+SX)/2, y:Y};
 await move(d, opts.dieOnWire? mid.x : b.x, opts.dieOnWire? mid.y : b.y, 500);
 if (opts.dieOnWire){ await kill(d,'dropped'); return null; }
 return d;
 }
 async function intoServer(d){
 if (VERT) await move(d, GV.wireX, G.server.y+28, 220);
 else await move(d, SX+60, Y, 220);
 }
 async function chargeBank(d, stampCls, stampTxt){
 if (VERT){ await move(d, GV.wireX, G.server.y+G.server.h+8, 220); await move(d, GV.wireX, G.bank.y-8, 380); }
 else { await move(d, SXR+8, Y, 220); await move(d, BX-8, Y, 380); }
 var e = bankStamp(stampTxt||'+ $100 CHARGE', stampCls);
 d.remove(); return e;
 }
 async function replyBack(kind, txt){
 var r, lbl, fill = kind==='err'?'#ef4444':'#22c55e';
 if (VERT){
  r = dot(GV.wireX-18, G.server.y-4, kind==='err'?'err':'reply');
  await move(r, GV.wireX-18, G.client.y+G.client.h+16, 480);
 } else {
  r = dot(SX-4, Y-14, kind==='err'?'err':'reply');
  await move(r, CX+16, Y-14, 480);
 }
 var p = placeLabel('wire', VERT ? GV.wireX : CX); /* §3: reply verdict in the wire band, not on the wire */
 lbl = bandText(p, fill, txt);
 setTimeout(function(){ r.remove(); lbl.remove(); }, 1700/speed);
 await sleep(450);
 }
 async function replyDies(){
 var r;
 if (VERT){ r = dot(GV.wireX-18, G.server.y-4, 'reply'); await move(r, GV.wireX-18, (G.server.y + G.client.y + G.client.h)/2, 280); }
 else { r = dot(SX-4, Y-14, 'reply'); await move(r, (CX+SX)/2, Y-14, 280); }
 await kill(r, 'reply lost');
 }

 /* ---------- events ---------- */
 var EVMETA = [
 {chip:'1 · NORMAL CHARGE'}, {chip:'2 · REQUEST LOST'}, {chip:'3 · CRASH MID-CHARGE'},
 {chip:'4 · REPLY LOST'}, {chip:'5 · TWO GENUINE ORDERS'}, {chip:'6 · LATE RETRY'}
 ];
 function card(cls, code, body, src, knob){
 var d=document.createElement('div'); d.className='bcard '+cls;
 d.innerHTML='<span class="code">'+code+'</span><div>'+body+(knob?' <span class="kl" data-knob="'+knob+'">\u2192 the decision</span> \u00b7 <a class="khint" href="#'+(({id:'q1',cli:'q1',read:'q2',mem:'q3',rep:'q4',ret:'q5',params:'q6',after:'q6'})[knob]||'q1')+'">hint \u2193</a>':'')+'</div>'+(src?'<div class="src">'+src+'</div>':'');
 $('#log').prepend(d);
 d.querySelectorAll('.kl').forEach(function(k){ k.addEventListener('click', function(){ cueDecision(k.dataset.knob); }); });
 }
 /* F13 (A2): "→ the decision" no longer scrolls the page by default. It
    cues the target group (data-cue="group" + .cue-target for 1.6s), then
    restores the prior cue. During an attack it never steals the attack's own
    cue: a different group only .flashg's. It scrolls only when the group is
    fully outside the viewport, and then flashes on ARRIVAL (scrollend, 400ms
    fallback) -- never mid-scroll; window.scrollTo, never scrollIntoView. On
    desktop the deck is beside the stage in the sticky layout, so the group is
    usually already on screen and nothing scrolls. On phone the frame is
    content-height, so the group reads as on-screen here and the host does the
    page scroll from the bridge's anchor message (§2 opens the accordion
    first). */
 function cueDecision(knob){
  var kg = document.getElementById('kg-'+knob); if (!kg) return;
  /* §2/A3: on phone open the target group in the accordion first, then cue it;
     the host does the page scroll (bridge anchor). */
  if (mq(PHONE_MQ)){ openGroup = knob; paintDeck(); kg = document.getElementById('kg-'+knob); if (!kg) return; }
  var artB = $('#artB');
  var attackActive = escMode >= 0;
  var attackGroup = (attackActive && LEVELS[escMode]) ? LEVELS[escMode].group : null;
  var isAttackGroup = !!attackGroup && ('kg-'+attackGroup) === kg.id;
  var useCue = !attackActive || isAttackGroup;
  function flash(){
   if (useCue){
    var saved = artB.dataset.cue;
    kg.classList.add('cue-target'); artB.dataset.cue = 'group';
    setTimeout(function(){ if (artB.dataset.cue === 'group') artB.dataset.cue = saved; kg.classList.remove('cue-target'); }, 1600);
   } else {
    kg.classList.remove('flashg'); void kg.offsetWidth; kg.classList.add('flashg');
   }
  }
  var r = kg.getBoundingClientRect();
  var offscreen = r.bottom <= 0 || r.top >= window.innerHeight;
  if (!offscreen){ flash(); return; }
  var done = false;
  function arrive(){ if (done) return; done = true; window.removeEventListener('scrollend', arrive); flash(); }
  window.addEventListener('scrollend', arrive);
  setTimeout(arrive, 400); /* fallback: Safari < 16 has no scrollend */
  window.scrollTo({ top: Math.max(0, r.top + window.pageYOffset - window.innerHeight * 0.3), behavior:'smooth' });
 }
 function idKind(){ return K.id==='key'?'key': K.id==='hash'?'hash':'plain'; }

 var EVENTS = [
 async function routine(){
  if (runsDone>0){ say('EVENT 1/6','Routine ✓ (compressed on repeat runs).'); bankStamp('+ $100 CHARGE'); if(K.mem!=='none') memNote('K-4 ✓'); await sleep(700); return {cls:'good'}; }
  say('EVENT 1/6','Routine traffic. A charge crosses, the bank records it, the response comes home. This is the day when nothing goes wrong.');
  var d = await animRequest(idKind()); await chargeBank(d); if(K.mem!=='none') memNote('K-4 \u2713 remembered');
  await replyBack('ok','\u2713 charged');
  return {cls:'good'};
 },
 async function cut1(t){
  say('EVENT 2/6','<b>The network drops a request</b>. It never reaches the server. The client is left with a timeout and nothing else.');
  await animRequest(idKind(), {dieOnWire:true});
  if (t==='LOST_SALE'){ say('EVENT 2/6','The client <b>gives up</b>. Nothing was charged, and nothing ever will be. The order is silently lost.');
  card('bad','ORDER LOST','The client assumed failure and never retried, so the order silently vanished.','Stripe: treat a success as a failure and the customer never gets what they paid for.','cli');
  return {cls:'bad'}; }
  say('EVENT 2/6','The client retries'+(K.cli==='key'?' <b>carrying the same key</b>':' as a brand-new request')+'. Nothing had happened, so this one lands clean'+(K.cli==='blind'?', <b>by luck</b>: from the client seat this cut is indistinguishable from event 4':'')+'.');
  var d2 = await animRequest(K.cli==='key'?idKind():'plain');
  if (K.cli==='key' && K.mem!=='none') await checkMemory(false);
  await chargeBank(d2); await replyBack('ok','\u2713 charged');
  return {cls:'good'};
 },
 async function cut2(t){
  say('EVENT 3/6','<b>The server dies mid-charge.</b> Did the bank move the money first? Even the bank\'s own record is uncertain.');
  var d = await animRequest(idKind());
  await intoServer(d);
  await flashServer('#ef4444');
  if (t==='TICKET_MYST'){ await kill(d,'crash'); bankStamp('$100? · UNKNOWN','dbl');
  card('warn','UNRESOLVED: NOBODY KNOWS','Did the charge go through? Neither the customer nor your system can tell. It surfaces later as a support complaint.','Shopify\'s fix for cases like this is reconciliation: check your records against the bank afterward.','cli');
  return {cls:'warn'}; }
  if (t==='DBL_CRASH'){ bankStamp('+ $100 CHARGE'); await kill(d,'crash after charging');
  say('EVENT 3/6','The retry arrives as a stranger. The server has no way to recognize it.');
  var r=await animRequest('plain'); await chargeBank(r,'dbl','+ $100 AGAIN \u26A0');
  card('bad','DOUBLE CHARGE: CRASH, THEN AN UNRECOGNIZED RETRY','The first attempt charged before the server died. The retry carried no key the server could recognize, so it charged again.','Stripe 2017: the retry must carry something the server can recognize. That is the whole idempotency-key idea.','id');
  return {cls:'bad'}; }
  if (t==='DBL_GAP'){ bankStamp('+ $100 CHARGE'); await kill(d,'crash before memory write');
  say('EVENT 3/6','The charge went through, but the server crashed <b>before the separate store recorded it</b>. The record and the charge came apart.');
  var r2=await animRequest('key'); await checkMemory(false); await chargeBank(r2,'dbl','+ $100 AGAIN \u26A0'); memNote('K \u2713 (retry only)');
  card('bad','DOUBLE CHARGE: THE KEY WAS NEVER RECORDED','The retry found "never seen" and charged again. (The crash could just as easily have landed before the charge, and a separate store can\'t guarantee which.)','AWS: record the key and make the charge one all-or-nothing transaction. Stripe names the same gap: recovery is "heavily dependent on implementation."','mem');
  return {cls:'bad'}; }
  if (t==='CLEAN_RECOVERY'){ bankStamp('+ $100 CHARGE'); await kill(d,'crash mid-steps');
   say('EVENT 3/6','The store tracked <b>how far the charge got</b>. The retry runs recovery steps that finish from there, so only one charge ever reaches the bank.');
   var rr=await animRequest('key'); await checkMemory(true); memNote('steps recorded \u00b7 rebuilding'); await sleep(600); rr.remove(); await replyBack('ok','\u2713 charged (recovered)');
   card('good','SURVIVED: RECOVERY STEPS REBUILT THE STATE','The crash interrupted the charge; the store knew how far it got, so the retry finished the job without charging the bank twice. The cost is on the bill: recovery code for every step.','Shopify 2022; Airbnb 2019 buys the same safety with three all-or-nothing phases.',null);
   return {cls:'good'}; }
  var stamp = bankStamp('+ $100 CHARGE'); await kill(d,'crash');
  say('EVENT 3/6','The record and the charge were <b>one transaction</b>, so the crash erases both together. Watch the bank\'s record take the charge back.');
  await sleep(550); bankAmend(stamp,'$100 · rolled back','gone');
  var r3=await animRequest('key'); await checkMemory(false); await chargeBank(r3); memNote('K \u2713'); await replyBack('ok','\u2713 charged');
  card('good','CLEAN: THE CRASH ROLLED BACK','One transaction means a half-done charge can\'t exist. The retry found nothing and ran fresh.','AWS; Airbnb buys the same safety with three all-or-nothing phases; Shopify with recovery steps.',null);
  return {cls:'good'};
 },
 async function cut3(t){
  say('EVENT 4/6','<b>The charge lands, and the response dies on the way back.</b> The bank\'s record says $100. The client sees only a timeout.');
  var d = await animRequest(idKind()); await chargeBank(d); if(K.mem!=='none') memNote('K-9 \u2713');
  await replyDies();
  if (t==='TICKET_WRITEOFF'){ card('bad','CHARGED, THEN TREATED AS FAILED','The client thinks the charge failed, so your system has no record of it. The customer paid $100 for an order you can\'t see.','Stripe: the quiet version of the disaster. The customer pays and gets nothing.','cli'); return {cls:'bad'}; }
  if (t==='DBL_CLASSIC'){ say('EVENT 4/6','The retry arrives unrecognized and does it all again.');
  var d2=await animRequest(K.cli==='key'?idKind():'plain'); if(K.cli==='key'&&K.mem!=='none') await checkMemory(false); await chargeBank(d2,'dbl','+ $100 AGAIN \u26A0');
  card('bad','THE COMMON DOUBLE CHARGE','The charge went through, the response was lost, and the retry charged again. 0.6% of all events at Segment over four weeks. A constant, not an edge case.','This is the failure every system on this page is built to prevent.', K.id==='none'?'id':'mem');
  return {cls:'bad'}; }
  if (t==='DBL_REPLICA'){ say('EVENT 4/6','The retry checks <b>the read-only copy</b>, which is seconds behind and hasn\'t heard yet.');
  var rn=document.getElementById('replicanote'); if(rn) rn.textContent='K-9? not here yet';
  var d3=await animRequest('key'); await checkMemory(false,true); await chargeBank(d3,'dbl','+ $100 AGAIN \u26A0');
  card('bad','DOUBLE CHARGE, WITH THE KEY ON','The record exists, on the main database. The read-only copy that answered was seconds behind.','Airbnb: a copy that runs seconds behind turns a correct retry into a double charge. Orpheus reads from the main database only.','read');
  return {cls:'bad'}; }
  if (t==='CLEAN_ERR_REPLY'){ say('EVENT 4/6','The retry is recognized and gets back an <b>error: "already processed"</b>. No double charge. The cost lands on the caller.');
  var d4=await animRequest('key'); await checkMemory(true); d4.remove(); await replyBack('err','"ERROR: already processed"');
  card('good','SURVIVED, BUT THE CALLER PAYS','One charge, correct outcome. But every caller must now write extra code to treat this error as a success. That cost is on the bill.','AWS 2021: idempotent, but exactly what makes retry-by-default hard to offer. Stripe/Airbnb return the saved response instead, and pay in stored results.','rep');
  return {cls:'good'}; }
  say('EVENT 4/6','The retry is recognized, and the server <b>returns the saved response</b> as if it were the first one.');
  var d5=await animRequest('key'); await checkMemory(true); d5.remove(); await replyBack('ok','\u2713 charged (replayed)');
  card('good','THE RETRY WAS FREE','One charge, correct response: the saved response returned.','Stripe / Airbnb; AWS sharpens the reply to "same-meaning success".',null);
  return {cls:'good'};
 },
 async function twins(t){
  say('EVENT 5/6','A customer places <b>two identical $100 orders on purpose</b>. Same details, but both are genuinely wanted.');
  var a = await animRequest(idKind()); await chargeBank(a);
  var b = await animRequest(idKind());
  if (t==='LOST_TWIN'){ await checkMemory(true); await kill(b,'"duplicate": dropped');
  card('bad','TWO ORDERS COLLAPSED INTO ONE','The server built a fingerprint from the request\'s details, saw a match, and silently dropped the second order. A fingerprint can\'t tell an accidental repeat from a customer who genuinely wants two of the same.','AWS: identical request parameters do not mean identical intent. Only the caller knows that, so the caller names the request.','id');
  return {cls:'bad'}; }
  if (K.id==='key' && K.mem!=='none') await checkMemory(false);
  await chargeBank(b,'','+ $100 CHARGE (2nd)');
  card('good','BOTH ORDERS WENT THROUGH','Two orders, two keys'+(K.id==='key'?' (the caller generated a fresh key for the second)':'')+', two charges. The customer got what they actually wanted.', K.id==='key'?'AWS: the token carries intent, so twins are distinguishable by name.':'', null);
  return {cls:'good'};
 },
 async function late(t){
  if (t==='NA'){ say('EVENT 6/6','A client wakes up late and retries. But with no way to recognize a repeat, this is just the earlier failures again. (Fix those first.)'); await sleep(700); return {cls:'good'}; }
  say('EVENT 6/6','<b>Three minutes later</b>, a mobile client wakes up and retries an old charge with its old key.');
  var hand=document.getElementById('clockhand'); if(hand){ hand.style.transition='transform .8s'; hand.style.transformOrigin=G.clock.cx+'px '+G.clock.cy+'px'; hand.style.transform='rotate(160deg)'; }
  await sleep(850);
  if (t==='DBL_EXPIRE'){ say('EVENT 6/6','The one-minute window <b>has already forgotten the key</b>.');
  var d=await animRequest('key'); await checkMemory(false); await chargeBank(d,'dbl','+ $100 AGAIN \u26A0');
  card('bad','THE MEMORY EXPIRED FIRST','The key was real, but the window had already forgotten it.','AWS: keep keys too briefly and a late retry charges again. Shopify: the window is a dial you set on purpose (~24h).','ret');
  return {cls:'bad'}; }
  if (K.ret==='ever'){ var d2=await animRequest('key'); await checkMemory(true); d2.remove(); await replyBack('ok','\u2713 (replayed)');
  card('good','LATE, AND STILL REMEMBERED, FOREVER','Returned fine. The cost is on the bill: every key ever seen, kept forever.','AWS 2021 names both costs of the too-long window.',null);
  return {cls:'good'}; }
  if (K.ret==='size'){ var d2b=await animRequest('key'); await checkMemory(true); d2b.remove(); await replyBack('ok','\u2713 (replayed)');
  card('good','LATE, BUT INSIDE THE (CURRENTLY FULL-SIZE) WINDOW','Three minutes is nothing today. Under heavy load this window shrinks. That cost is on the bill, and one of the attacks below is about exactly this.','Segment 2017: limited by size, drop the oldest first, alert an engineer if it thins past a day.',null);
  return {cls:'good'}; }
  var d3=await animRequest('key'); await checkMemory(true); d3.remove(); await replyBack('ok','\u2713 (replayed)');
  card('good','LATE, BUT REMEMBERED','Inside the deliberate window, a three-minute nap costs nothing.','Shopify: ~24h, chosen on purpose.',null);
  return {cls:'good'};
 }
 ];

 /* ---------- run control ---------- */
 function chips(){ var h=''; EVMETA.forEach(function(m,i){ h+='<div class="evchip" data-i="'+i+'">'+m.chip+'</div>'; }); $('#evchips').innerHTML=h; }
 function meters(dmg){
 function set(id,v,badCls){ var e=$(id); e.textContent=v; e.className='n '+((v===0||v==='OK')?'good':badCls); }
 /* B2-4: DOUBLES shows the day's doubles PLUS any counted during attacks. */
 set('#m-dbl',dmg.dbl + attackDbl,'bad'); set('#m-lost',dmg.lost,'bad'); set('#m-tick',dmg.tick,'warn');
 updateMeterNote();
 }
 /* B2-4: each dbl stamp during an attack adds to DOUBLES; the sub-line marks
    the meters as "today + attacks" once any attack has run. */
 function updateMeterNote(){ var n=$('#meternote'); if(!n) return; if(anyAttackRun){ n.textContent='today + attacks'; n.classList.add('on'); } else { n.classList.remove('on'); } }
 function markAttackRun(){ anyAttackRun = true; updateMeterNote(); }
 function bumpAttackDouble(){
 attackDbl++; anyAttackRun = true;
 var v = (dayDamage ? dayDamage.dbl : 0) + attackDbl;
 var e = $('#m-dbl'); e.textContent = v; e.className = 'n ' + (v===0 ? 'good' : 'bad');
 updateMeterNote();
 }
 function lock(on){ $('#artB').classList.toggle('locked', on); $('#runbtn').disabled=on; $('#stepbtn').disabled=on; }

 async function playEvent(i){
 curEv = i;
 resetLabelSlots(); /* §3: band slots are per-event */
 var t = dayDamage.ev[i].t;
 var chip = $('.evchip[data-i="'+i+'"]'); chip.classList.add('now');
 var res = await EVENTS[i](t);
 chip.classList.remove('now'); chip.classList.add(res.cls==='good'?'clean':'hurt');
 await sleep(600);
 }
 function freshDay(){
 dayDamage = dayTokens(K); evIdx = 0; bankEntries = [];
 $('#log').innerHTML=''; chips(); drawStage(); layerAnim = el('g',{});
 ['#m-dbl','#m-lost','#m-tick'].forEach(function(s){ $(s).textContent='-'; $(s).className='n'; });
 attackDbl = 0; anyAttackRun = false; updateMeterNote(); /* B2-4: a new day resets the meters to today */
 }
 function renderBill(bill){
  var host=$('#bill'); if(!host) return;
  if(!bill || !bill.length){ host.style.display='none'; return; }
  host.style.display='';
  var rows = bill.map(function(b){
   return '<div class="billrow'+(b.base?' base':'')+'">'+(b.base?'<span class="bl">BASELINE</span> ':'')+b.c+' <span class="bs">'+b.s+'</span></div>';
  }).join('');
  host.innerHTML='<div class="billhead">THE BILL: what your surviving design pays</div>'+rows;
 }
 async function finishDay(){
 runsDone++;
 var rb=$('#runbtn'); rb.innerHTML='RUN AGAIN ▶';
 $('#artB').dataset.cue = dayDamage.win ? '' : 'deck';
 if (dayDamage.extra==='NONAME') card('warn','A NAME WITH NO MEMORY','Requests carry a key, but the server keeps no record of it, so it can never recognize a repeat.','Stripe: the key only works if the server also stores a record of it. The key by itself does nothing.','mem');
 meters(dayDamage);
 renderBill(dayDamage.win ? dayDamage.bill : null);
 if (dayDamage.win){
  say('DAY SURVIVED','Nothing broke. But every safe design has a cost, and the panel below (THE BILL) lists what yours pays. Next: five real failures that still get through your design.');
  card('good','DAY SURVIVED','Zero double charges, zero lost orders, zero unresolved payments. The bill lists what this design pays for that, each line named by the company that paid it first.','', null);
  if (!won){ won = true; buildLevels(); }
  $('#escwrap').style.display='';
 } else {
  say('DAY OVER','See what broke. Each result points at one of your decisions. The five answers below show how the real companies handled it. Adjust a decision and run again.');
 }
 }
 async function runAll(){
 if (running) return;
 if (escMode>=0){ if (!FREE){ say('ATTACK ACTIVE','Finish the attack first: fix it with your decisions and re-run it. The day waits.'); return; } escAbandon(); }
 running=true; lock(true); $('#artB').dataset.cue='';
 freshDay();
 for (var i=0;i<6;i++) await playEvent(i);
 await finishDay(); lock(false); running=false;
 }
 async function stepOne(){
 if (running) return;
 if (escMode>=0){ if (!FREE){ say('ATTACK ACTIVE','Finish the attack first: fix it with your decisions and re-run it. The day waits.'); return; } escAbandon(); }
 if (evIdx===0 || evIdx>=6) freshDay();
 running=true; lock(true); $('#artB').dataset.cue='';
 await playEvent(evIdx); evIdx++;
 if (evIdx>=6) await finishDay();
 else say('PAUSED','Event '+evIdx+' of 6 done. STEP for the next. The day is one design, so your decisions stay fixed mid-day.');
 lock(false); running=false;
 }

 /* ---------- escalations ---------- */
 var escMode = -1, curLvl = 0, escWatched = [false,false,false,false,false], l1Tried = false;

 /* attack animations reused across watch + re-run; each reads the CURRENT decisions */
 async function animOldKeyReplay(){
  var d=await animRequest('key'); await checkMemory(true); d.remove();
  if (K.rep==='err'){ await replyBack('err','"ERROR: already processed"'); }
  else { await replyBack('ok','\u2713 (last week\'s result, replayed)'); }
 }
 async function animCut3Replay(){
  var d=await animRequest('key'); await chargeBank(d); memNote('K \u2713');
  var r=dot(SX-4,Y-14,'reply'); await move(r,(CX+SX)/2,Y-14,260); await kill(r,'reply lost');
  var d2=await animRequest('key');
  if (K.read==='replica'){ await checkMemory(false,true); await chargeBank(d2,'dbl','+ $100 AGAIN \u26A0'); return false; }
  await checkMemory(true); d2.remove(); await replyBack('ok', K.rep==='err'?'"ERROR: already processed"':'\u2713 charged (replayed)'); return true;
 }
 async function animBurstThenStraggler(){
  for (var i=0;i<6;i++){ var d=dot(CX+14,Y,'key'); move(d, BX-8, Y, 460).then((function(dd){return function(){ dd.remove(); bankStamp('+ $100'); };})(d)); await sleep(150); }
  await sleep(700);
 }
 async function animLateKey(found){
  var d=await animRequest('key'); await checkMemory(found);
  if (found){ d.remove(); await replyBack('ok','\u2713 (replayed)'); return true; }
  await chargeBank(d,'dbl','+ $100 AGAIN \u26A0'); return false;
 }
 async function animParamsMismatch(){
  var d=await animRequest('key'); await checkMemory(true);
  memNote('details differ \u26A0'); await sleep(900); return d;
 }
 async function animReconcileSweep(){
  say('RECONCILIATION','A sweep compares your record against the bank\'s\u2026');
  var sweep=el('line',{x1:G.bank.x,y1:G.bank.y+8,x2:G.bank.x,y2:G.bank.y+G.bank.h-8,stroke:'#22c55e','stroke-width':2},layerAnim);
  var t0=null; await new Promise(function(res){ function f(ts){ if(!t0)t0=ts; var p=Math.min(1,(ts-t0)/(1200/speed)); sweep.setAttribute('x1',G.bank.x+p*G.bank.w); sweep.setAttribute('x2',G.bank.x+p*G.bank.w); if(p<1)requestAnimationFrame(f); else res(); } requestAnimationFrame(f); });
  sweep.remove(); bankStamp('\u2212 $100 ANOMALY \u00b7 refunded \u2713');
 }

 var LEVELS = [
  { t:'A1 \u00b7 STRIPE: A DEVELOPER USING YOUR API REUSES LAST WEEK\'S KEY', group:null,
   brief:'The one attack no decision fixes, and finding that out is the level. Change anything you like, then re-run.',
   attack: async function(){
    say('ATTACK 1','A request arrives wearing <b>last week\'s key</b>, for a brand-new charge.');
    await animOldKeyReplay();
    say('ATTACK 1','The server did its job perfectly, and the new charge <b>silently never happened</b>. Nothing on your stage even looks wrong. Change any decision, then re-run the attack.');
   },
   rerun: async function(){
    await animOldKeyReplay(); l1Tried = true;
    card('bad','THE NEW CHARGE STILL NEVER HAPPENED','Nothing in your decisions can see this. Two requests with the same key are duplicates by definition. That is the contract itself.','Stripe 2017.',null);
    return { held:false, showAccept:true };
   },
   accept:'Accept: this is caller discipline, not a server decision',
   acceptBody:'Stripe\'s actual answer: correctness here depends on key hygiene in every integrating codebase, which is why the post urges APIs to make idempotency explicit and documented. Publish the key rules; scope keys per request. The one attack you cannot fix with a decision.',
   hints:[
    ['add server-side detection of stale keys','There is no signal to detect. Two requests with the same key are duplicates BY DEFINITION.'],
    ['switch identity to a parameter hash','That reopens the identical-orders trap: a hash cannot carry what the customer wanted.'],
    ['publish key rules; scope keys per request','This is the answer, and it lives in documentation and client code, not in your decisions here.'] ] },

  { t:'A2 \u00b7 AIRBNB: SOMEONE MOVES YOUR KEY READS TO THE READ-ONLY COPIES', group:'read',
   brief:'This attack flips one of your decisions. Fix it with your decisions, then re-run.',
   attack: async function(){
    say('ATTACK 2','The main database is expensive to read from. Someone points key reads at <b>a read-only copy, seconds behind</b>\u2026');
    K.read='replica'; drawStage(); paintDeck(); layerAnim=el('g',{}); await sleep(650);
    await animCut3Replay();
    say('ATTACK 2','Seconds of lag, and the double charge is back, <b>with the key on</b>. Your READS decision changed under you; it stays changed until you change it back.');
   },
   rerun: async function(){
    var held = await animCut3Replay();
    if (held){ card('good','HELD: THE RETRY ASKED THE MAIN DATABASE','The record was where it was written, and the response was free. Airbnb kept key reads on the main database and won the capacity back by splitting the key tables across machines.','Airbnb 2019.',null); }
    else { card('bad','BROKE AGAIN: THE READ-ONLY COPY HADN\'T HEARD','The record exists, on the main database. The read-only copy that answered was seconds behind.','Airbnb 2019: a copy that runs seconds behind turns a correct retry into a double charge.','read'); }
    return { held:held };
   },
   hints:[
    ['approve: seconds of lag is nothing','Seconds of lag is a double charge. You watched it.'],
    ['reads stay on the main database; shard on the key to win capacity back','Airbnb\'s answer verbatim, and the fix is the READS decision.'],
    ['shorten the replication lag instead','A smaller gamble is still a gamble: the guarantee would ride on a race you do not control.'] ] },

  { t:'A3 \u00b7 SEGMENT: TRAFFIC 10\u00D7s FOR A WEEK', group:'ret',
   brief:'Ten times the traffic, and your window decision is under attack. Fix it, then re-run.',
   attack: async function(){
    if (K.ret==='ever'){
     say('ATTACK 3','Ten times the traffic. Your store forgets nothing, so nothing is evicted. Watch it hold, and watch what it costs\u2026');
     await animBurstThenStraggler(); memNote('holding EVERYTHING \u00b7 store ballooning'); await sleep(800);
     await animLateKey(true);
     say('ATTACK 3','No straggler, and a store growing with all of history. Re-run to confirm, or change the WINDOW decision and see the other trades.');
    } else if (K.ret==='size'){
     say('ATTACK 3','Ten times the traffic. Your size-bound store evicts oldest-first by design, and under this much load, honest keys age out early\u2026');
     await animBurstThenStraggler(); memNote('evict oldest \u00b7 window shrinking \u00b7 PAGED'); await sleep(800);
     await animLateKey(false);
     say('ATTACK 3','A straggler aged out early and charged twice. The pager fired, exactly as designed. Re-run to see the posture hold, with its cost.');
    } else {
     say('ATTACK 3','Ten times the traffic. A fixed-time store cannot hold every key at this volume, so <b>the oldest quietly fall off</b>\u2026');
     await animBurstThenStraggler();
     memNote('oldest keys evicted \u2192'); await sleep(800);
     await animLateKey(false);
     say('ATTACK 3','An honest retry whose key <b>aged out early</b> just charged twice. Look at your WINDOW decision.');
    }
   },
   rerun: async function(){
    await animBurstThenStraggler();
    if (K.ret==='size'){
     memNote('evict oldest \u00b7 window shrinking \u00b7 PAGED'); await sleep(700);
     await animLateKey(true);
     card('good','HELD: THE WINDOW SHRANK ON PURPOSE','Bound by size, evict oldest first: the spike shrinks the protection window instead of toppling the store, and a pager fires if it thins past a day. Protection degraded gracefully, and that cost is already on your bill.','Segment 2017. "Almost exactly once" is the honest name.',null);
     return { held:true };
    }
    if (K.ret==='ever'){
     memNote('holding EVERYTHING \u00b7 store ballooning'); await sleep(700);
     await animLateKey(true);
     card('warn','HELD, BY REFUSING TO FORGET','No key was evicted, so no straggler doubled. The bill turns red instead: keys kept without bound, and under 10\u00D7 load the store grows without bound too. It holds, at a cost the five posts warn about.','AWS 2021; Airbnb 2019: the table grows with traffic and is hard to trim.','ret');
     return { held:true };
    }
    memNote('oldest keys evicted \u2192'); await sleep(700);
    await animLateKey(false);
    card('bad','BROKE AGAIN: KEYS AGED OUT EARLY','A fixed-time window can\'t hold 10\u00D7 the keys; the oldest fell off before their retries arrived.','Segment 2017: the answer is to bound by size and let the window shrink, paged.','ret');
    return { held:false };
   },
   hints:[
    ['grow the store without limit','It holds the attack, and the bill goes red on storage. Try it and see.'],
    ['bound by size, evict oldest, page under 24h','Segment\'s design. The WINDOW decision has this option.'],
    ['turn dedupe off under load','The spike is when retries multiply, so you would disarm the defense at peak attack.'] ] },

  { t:'A4 \u00b7 AWS: A KNOWN KEY ARRIVES WITH A DIFFERENT AMOUNT', group:'params',
   brief:'This attack adds a decision you hadn\'t made. It defaults to the naive answer. Re-run and watch it break, then fix it.',
   attack: async function(){
    say('ATTACK 4','Same key as this morning, but the amount changed: <b>$250, not $100</b>. Your decisions never covered this. A new row just appeared, defaulted to the naive answer.');
    ROWS_ADDED.params = true; if(!K.params) K.params='run'; openGroup='params'; paintDeck(); focusDeckSel('params'); /* B2-7; A3: the new row opens in the phone accordion */
    var d = await animParamsMismatch(); d.remove();
   },
   rerun: async function(){
    var d = await animParamsMismatch();
    if (K.params==='refuse'){ d.remove(); await replyBack('err','"VALIDATION: params changed"');
     card('good','HELD: THE MISMATCH WAS CAUGHT AND NAMED','The stored fingerprint exists precisely so this collision can be seen. The safest reading is that the customer meant something different. Refuse, and say why.','AWS 2021: the guarantee protects what the customer actually wanted.',null);
     return { held:true };
    }
    if (K.params==='replay'){ d.remove(); await replyBack('ok','\u2713 ($100, the OLD response)');
     card('bad','BROKE: THE CUSTOMER ASKED FOR $250 AND SILENTLY GOT $100','The old response was returned for a new request. That is the reused-key failure from attack 1, now endorsed by the server.','AWS 2021.','params');
     return { held:false };
    }
    await chargeBank(d,'dbl','+ $250 CHARGE \u00b7 SAME KEY \u26A0');
    card('bad','BROKE: ONE KEY NOW MEANS TWO THINGS','The charge ran. The same key produced two different requests, so the contract that made every retry safe just dissolved.','AWS 2021: two requests with the same token are duplicates by definition, or the definition is gone.','params');
    return { held:false };
   },
   hints:[
    ['run it: the parameters are the request','Then the same key means two things. Re-run and watch the contract dissolve.'],
    ['return the old response','The customer asked for something different and silently gets the old thing.'],
    ['refuse with a validation error','AWS\'s answer. The new row has this option.'] ] },

  { t:'A5 \u00b7 SHOPIFY: THE CASE YOUR WINDOW DECISION LEAVES OPEN', group:'after',
   brief:'The window will always miss someone. This attack adds the decision about what happens after it, defaulted to nothing.',
   attack: async function(){
    LEVELS[4].group = (K.ret==='ever') ? 'ret' : 'after';
    if (K.ret==='ever'){
     say('ATTACK 5','Months pass. A caller generates a fresh key that <b>collides with an ancient one</b>. Your store never forgot it.');
     await animOldKeyReplay();
     card('bad','AN ANCIENT KEY ATE A NEW CHARGE','The new charge silently never happened. The store recognized a key from another era and returned its old response. A window with no edge makes every old key a landmine.','AWS 2021: keep tokens too long and a future key can collide with an ancient one.','ret');
     say('ATTACK 5','No decision prevents stragglers AND collisions at once. <b>Bound the window</b> (WINDOW is glowing), then re-run, and watch what bounding it trades away.');
     return;
    }
    say('ATTACK 5','The clock spins past your window. The memory has legitimately forgotten, on schedule. A new row just appeared: what happens AFTER the window? It defaults to nothing.');
    ROWS_ADDED.after = true; if(!K.after) K.after='nothing'; openGroup='after'; paintDeck(); focusDeckSel('after'); /* B2-7; A3 */
    var hand=document.getElementById('clockhand'); if(hand){ hand.style.transition='transform 1.2s'; hand.style.transformOrigin=G.clock.cx+'px '+G.clock.cy+'px'; hand.style.transform='rotate(1000deg)'; }
    await sleep(1250);
    await animLateKey(false);
    say('ATTACK 5','A straggler outlived the window and charged twice. No decision prevents this one. The question is whether anyone ever finds out.');
   },
   rerun: async function(){
    if (K.ret==='ever'){
     await animOldKeyReplay();
     card('bad','STILL COLLIDING','The store still never forgets, so ancient keys still eat new charges. Bound the window first: WINDOW is the decision.','AWS 2021.','ret');
     return { held:false };
    }
    if (!ROWS_ADDED.after){
     ROWS_ADDED.after = true; if(!K.after) K.after='nothing'; LEVELS[4].group='after'; openGroup='after'; paintDeck(); focusDeckSel('after'); /* B2-7; A3 */
     say('ATTACK 5','Your window has an edge now, so a new decision exists: what happens AFTER it? It defaults to nothing. Watch what the edge costs\u2026');
     var hand=document.getElementById('clockhand'); if(hand){ hand.style.transition='transform 1.2s'; hand.style.transformOrigin=G.clock.cx+'px '+G.clock.cy+'px'; hand.style.transform='rotate(1000deg)'; }
     await sleep(1250);
     await animLateKey(false);
     card('bad','YOU TRADED THE COLLISION FOR A STRAGGLER','Bounding the window ended the collisions, and created the case the window misses. A straggler charged twice, and nobody was looking. Decide what happens after the window, then re-run.','Shopify 2022.','after');
     return { held:false };
    }
    await animLateKey(false);
    if (K.after==='reconcile'){
     await animReconcileSweep();
     dayDamage = dayTokens(K); renderBill(dayDamage.bill);
     card('good','HELD: CAUGHT, RECORDED, REPAIRED','The straggler still charged twice. The fix is detection, not prevention. The sweep compared your record against the bank\'s, logged the mismatch as an anomaly, and repaired it. Reconciliation joins your bill as a standing team cost.','Shopify 2022: the standing admission that prevention is never complete.',null);
     return { held:true };
    }
    card('bad','BROKE: THE DOUBLE CHARGE WAS NEVER FOUND','Nobody compared the records. The merchant\'s accountant finds it in three months, as a chargeback.','Shopify 2022: verify the money afterward (your records against the bank\'s, every mismatch logged).','after');
    return { held:false };
   },
   hints:[
    ['keep keys forever, so nothing is ever forgotten','Then nothing straggles, and every key ever seen becomes a landmine for a future collision. If you arrived here with forever on, you watched exactly that.'],
    ['a reconciliation sweep against the bank\'s records','Shopify\'s posture. The new row has this option. Note what it does NOT do: prevent.'],
    ['reject retries older than the window with an error','The hour-30 client cannot tell that error from a fresh failure, so the ambiguity is back for exactly the case the window missed.'] ] }
 ];

 function escEnter(i){
  escMode = i; curLvl = i+1;
  paintDeck(); $('#artB').dataset.cue = LEVELS[i].group ? 'group' : '';
  var lvlEl = $$('#lvls .lvl')[i];
  lvlEl.querySelector('.fixrow').style.display='';
  say('YOUR MOVE', LEVELS[i].group ? 'Fix it with your decisions (the group that matters is glowing), then <b>re-run the attack</b>. Hints are under the level if you want them.' : 'Try any change you like, then <b>re-run the attack</b>.');
 }
 function escAbandon(){
  if (escMode<0) return;
  var lvlEl=$$('#lvls .lvl')[escMode]; if (lvlEl){ lvlEl.querySelector('.fixrow').style.display='none'; }
  escMode=-1; curLvl=0; paintDeck(); $('#artB').dataset.cue='';
 }
 function escExit(i, held){
  if (held){
   escMode = -1; curLvl = 0; $('#artB').dataset.cue='';
   lvlDone[i]=true;
   var lvlEl=$$('#lvls .lvl')[i];
   lvlEl.querySelector('.done').style.display='inline';
   lvlEl.querySelector('.fixrow').style.display='none';
   paintDeck();
   if (i+1<LEVELS.length){ $$('#lvls .lvl')[i+1].classList.remove('locked2'); say('ATTACK '+(i+1)+' SURVIVED','Your design held. The next attack is unlocked.'); }
   if (lvlDone.every(Boolean)) buildDebrief();
  }
 }

 function buildLevels(){
  var host=$('#lvls'); host.innerHTML='';
  LEVELS.forEach(function(L,i){
   var d=document.createElement('div');
   d.className='lvl'+(i>0 && !FREE?' locked2':'');
   d.innerHTML='<div class="lt">'+L.t+' <span class="done">\u2713 HELD</span></div>'+
    '<div class="lq">'+L.brief+' <span class="watch" data-lvl="'+i+'">\u25B6 watch the attack</span></div>'+
    '<div class="fixrow" style="display:none;"><button class="opt rerunbtn" data-lvl="'+i+'">RE-RUN THE ATTACK \u25B6</button>'+
    (L.accept?'<button class="opt acceptbtn" data-lvl="'+i+'" style="display:none;">'+L.accept+'</button>':'')+'</div>'+
    '<details class="hints"><summary>HINTS</summary>'+
    L.hints.map(function(hh,j){ return '<button class="opt hintbtn" data-lvl="'+i+'" data-h="'+j+'">'+hh[0]+'</button>'; }).join('')+
    '<div class="verdict"></div></details>';
   host.appendChild(d);
  });
  $$('#lvls .watch').forEach(function(w){ w.addEventListener('click', async function(){
   var i=+w.dataset.lvl;
   if (running) return;
      if (!FREE && ($$('#lvls .lvl')[i].classList.contains('locked2') || lvlDone[i])) return;
      if (FREE && escMode>=0 && escMode!==i) escAbandon();
   running=true; lock(true);
   escWatched[i]=true; curLvl=i+1; layerAnim = el('g',{}); resetLabelSlots(); await LEVELS[i].attack();
   markAttackRun(); /* B2-4: an attack has run - the meters now read "today + attacks" */
   lock(false); running=false;
   escEnter(i);
  });});
  $$('#lvls .rerunbtn').forEach(function(b){ b.addEventListener('click', async function(){
   var i=+b.dataset.lvl;
   if (running || escMode!==i) return;
   running=true; lock(true);
   curLvl=i+1; layerAnim = el('g',{}); drawStage(); layerAnim = el('g',{}); resetLabelSlots();
   var res = await LEVELS[i].rerun();
   markAttackRun(); /* B2-4: a re-run is an attack running - keep the note on */
   lock(false); running=false;
   if (res.showAccept && l1Tried){ var a=$$('#lvls .lvl')[i].querySelector('.acceptbtn'); if(a) a.style.display=''; }
   escExit(i, !!res.held);
  });});
  $$('#lvls .acceptbtn').forEach(function(b){ b.addEventListener('click', function(){
   var i=+b.dataset.lvl; if (escMode!==i) return;
   var lvlEl=$$('#lvls .lvl')[i]; var v=lvlEl.querySelector('.verdict');
   v.className='verdict on good'; v.textContent=LEVELS[i].acceptBody;
   escExit(i, true);
  });});
  $$('#lvls .hintbtn').forEach(function(b){ b.addEventListener('click', function(){
   var i=+b.dataset.lvl, j=+b.dataset.h;
   var lvlEl=$$('#lvls .lvl')[i]; var v=lvlEl.querySelector('.verdict');
   v.className='verdict on'; v.textContent=LEVELS[i].hints[j][1];
  });});
 }

 /* ---------- generated debrief (from the final decisions + bill) ---------- */
 function drow(label, chose, who){ return '<b>'+label+':</b> '+chose+'<br><span style="color:#6B7280;">'+who+'</span><br><br>'; }
 function buildDebrief(){
  var d=$('#debrief'); d.className='debrief on';
  var bill = dayTokens(K).bill;
  var html='<span class="dt">HELD UNDER ATTACK: THE DEBRIEF</span><br><br>Your final design, decision by decision:<br><br>';
  html+=drow('IDENTITY','the caller names each request with a key',
   'Stripe 2017, Airbnb 2019 and AWS 2021 state it outright. Segment 2017 generates it in the SDK because its callers can\'t cooperate. Shopify\'s post doesn\'t say who generates it.');
  if (K.mem==='acid') html+=drow('MEMORY','committed together with the charge, in one transaction',
   'AWS 2021: the half-failures aren\'t allowed to exist. The cost is on your bill: the charge must live in the same database as its record, so nothing that crosses to an external partner can sit inside the commit. The other clean shape (a separate store plus recovery steps) is Shopify\'s, and pays in recovery code instead.');
  else html+=drow('MEMORY','a separate store, plus recovery steps that rebuild state',
   'Shopify 2022; Airbnb 2019 in spirit, with three all-or-nothing phases. The cost is on your bill: recovery code per step. The other clean shape (one transaction) is AWS\'s, and pays by keeping the charge inside one database, away from external partners.');
  html+=drow('READS','the main database, where the record was written',
   'Airbnb 2019 is the post that states it, and it is the baseline every safe design pays. Airbnb paid it by splitting the key tables across machines, by key.');
  if (K.rep==='saved') html+=drow('REPLY','a duplicate gets the saved response',
   'Stripe 2017 and Airbnb 2019; AWS 2021 sharpens it to a same-meaning success. The cost is on your bill: responses stored for every request, a table that grows with traffic. The alternative (an error) moves that cost into every caller\'s code. Segment answers with silence; none of these map to it, because its callers can\'t use the information.');
  else html+=drow('REPLY','a duplicate gets "error: already processed"',
   'None of the five ship this as the design. AWS 2021 argues it is exactly what makes retry-by-default hard to offer. The cost is on your bill: every caller writes branching code. The alternative (return the saved response) is Stripe/Airbnb\'s, and pays in stored responses instead.');
  if (K.ret==='day') html+=drow('WINDOW','about 24 hours, chosen on purpose',
   'Shopify 2022. Cost: stragglers after the window. Segment\'s alternative bounds by size and shrinks under load; forever is the option none of the five chose.');
  else if (K.ret==='size') html+=drow('WINDOW','limited by size: drop the oldest, alert an engineer under 24h',
   'Segment 2017. Costs: stragglers, plus a window that shrinks under load. "Almost exactly once" is the honest name.');
  else html+=drow('WINDOW','forever',
   'None of the five kept keys without bound. AWS 2021 warns a future key can collide with an ancient one. It held the load attack by paying in storage.');
  if (K.params) html+= (K.params==='refuse'
   ? drow('SAME KEY, NEW PARAMS','refuse, naming the mismatch','AWS 2021: the stored fingerprint exists precisely so the collision can be caught. The guarantee protects what the customer actually wanted.')
   : drow('SAME KEY, NEW PARAMS', K.params==='run'?'run it':'return the old response','None of the five, and the attack showed why.'));
  if (K.after) html+= (K.after==='reconcile'
   ? drow('AFTER THE WINDOW','a reconciliation sweep against the bank\'s records','Shopify 2022: verify the money afterward, log every mismatch as an anomaly. Detection, not prevention; a standing team cost, on your bill.')
   : drow('AFTER THE WINDOW','nothing','None of the five ship this. The straggler is real, and someone else finds it.'));
  html+='<b>THE BILL, IN FULL:</b><br>'+bill.map(function(b){ return '\u2022 '+b.c+' <span style="color:#6B7280;">('+b.s+')</span>'; }).join('<br>')+'<br><br>';
  html+='Same guarantee, different price. <b>That trade is the interview answer.</b>';
  d.innerHTML=html;
 }
 function debrief(){ buildDebrief(); }

 /* ---------- restore (B2-1/F6) ----------
    The one host->mission call that mutates engine state: rebuild a saved
    design without animating. Set K (incl. attack-added rows present in the
    saved decisions), repaint the deck + stage; if it survived, show the
    bill, reveal the attacks, mark the held ones and unlock the next, and
    label RUN "AGAIN". The host calls this once from the init handler, then
    emits state so the YOU column / diagram / ticks fill. */
 function restore(decisions, survived, held){
 decisions = decisions || {};
 ['id','mem','read','cli','rep','ret','params','after'].forEach(function(k){
  if (decisions[k] != null) K[k] = decisions[k];
 });
 ROWS_ADDED.params = decisions.params != null;
 ROWS_ADDED.after = decisions.after != null;
 paintDeck(); drawStage();
 if (!survived) return;
 won = true; runsDone = 1;
 dayDamage = dayTokens(K);
 meters(dayDamage);
 renderBill(dayDamage.win ? dayDamage.bill : null);
 buildLevels();
 $('#escwrap').style.display='';
 held = held || [];
 var lvls = $$('#lvls .lvl');
 for (var i=0;i<LEVELS.length;i++){
  if (held[i]){
   lvlDone[i]=true;
   if (lvls[i]){ lvls[i].querySelector('.done').style.display='inline'; lvls[i].classList.remove('locked2'); }
   if (lvls[i+1]) lvls[i+1].classList.remove('locked2');
  }
 }
 if (lvlDone.every(Boolean)) buildDebrief();
 $('#runbtn').innerHTML='RUN AGAIN ▶';
 $('#artB').dataset.cue='';
 say('RESTORED','Your design from last time. Run it again, or go straight to the attacks.');
 }

 $('#runbtn').addEventListener('click', runAll);
 $('#stepbtn').addEventListener('click', stepOne);
 $('#resetbtn').addEventListener('click', function(){
 if (running) return;
 K={ id:'none', mem:'none', read:'master', cli:'blind', rep:'err', ret:'day' }; ROWS_ADDED={params:false,after:false}; delete K.params; delete K.after;
 won=false; lvlDone=[false,false,false,false,false]; evIdx=0; escMode=-1; curLvl=0; escWatched=[false,false,false,false,false]; l1Tried=false; runsDone=0;
 var rb=$('#runbtn'); rb.innerHTML='RUN THE DAY (NAIVE) ▶'; $('#artB').dataset.cue='run';
 $('#escwrap').style.display='none'; $('#debrief').className='debrief'; var bp=$('#bill'); if(bp) bp.style.display='none';
 freshDay(); paintDeck(); say('RESET','Naive decisions restored. The saved design for this wall is cleared; your sentence is kept.');
 });

 chips(); drawStage(); paintDeck();
 if (REDUCED){ say('READY','Reduced motion is on. STEP plays the day one event at a time. Run it first with the naive defaults and observe what breaks.'); } /* B2-11: STEP-promote / RUN-demote is now one reduced-motion CSS rule */
 else say('READY','Run it first with the naive defaults and observe what breaks. <b>RUN the day as-is.</b>');
 return { restore: restore };
}

// ---- the host bridge (this port) -----------------------------------------
function bootBridge(engine) {
 'use strict';
 var $ = function(s){ return document.querySelector(s); };
 var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
 var stored = null;     // the locked-in commit, from init or from Lock it in
 var skipped = false;   // Skip, for the page's lifetime
 var filled = false;    // the design has survived a day (escwrap visible)
 var cleanups = [];

 function post(msg){
  try { window.parent.postMessage(Object.assign({ v: 1, wall: WALL }, msg), '*'); } catch (e) {}
 }

 /* ---- read the current decisions and held-attacks from the DOM (v7 host script, verbatim) ---- */
 function readK(){
  var K = {};
  ['id','mem','read','cli','rep','ret','params','after'].forEach(function(k){
   var b = $('#deck button[data-k="'+k+'"].sel');
   if (b) K[k] = b.dataset.v;
  });
  return K;
 }
 function readHeld(){
  return $$('#lvls .lvl').map(function(l){
   var d = l.querySelector('.done');
   return !!(d && d.style.display !== 'none' && d.style.display !== '');
  });
 }
 function wonVisible(){ var e=$('#escwrap'); return !!(e && e.style.display !== 'none'); }
 function survivedVisible(){ var b=$('#bill'); return !!(b && b.style.display !== 'none'); }
 /* the v7 host script's refresh() gate: once the bill has shown, the design has survived a day */
 function refresh(){ if (!filled && !survivedVisible()) return; filled = true; }

 /* ---- state: coalesced per tick; survived = the design has survived a day ---- */
 var statePending = false;
 function emitState(){
  if (statePending) return;
  statePending = true;
  setTimeout(function(){
   statePending = false;
   var K = readK(), held = readHeld(), won = wonVisible();
   post({ type: 'state', decisions: K, held: held, survived: won, bill: won ? dayTokens(K).bill : [] });
  }, 0);
 }

 /* ---- checkpoints, once each ---- */
 var cp = { caused: false, survived: false, held: false };
 function checkpoint(kind){ if (cp[kind]) return; cp[kind] = true; post({ type: 'checkpoint', kind: kind }); }

 /* ---- commit before compare (v7 host script; storage moved to the host) ---- */
 function showLocked(s){
  $('#cmt-ask').style.display = 'none';
  var l = $('#cmt-locked');
  l.style.display = '';
  l.innerHTML = '"' + s.text.replace(/</g,'&lt;') + '" <button class="bghost" id="cmt-change" style="border:none;text-decoration:underline;">change</button>';
  $('#cmt-change').addEventListener('click', function(){
   $('#cmt-ask').style.display = ''; $('#cmt-input').value = s.text; l.style.display = 'none';
  });
  $('#cmtbox').style.display = '';
 }
 function maybeShowCommit(){
  if (stored){ showLocked(stored); return; }
  if (!filled) return;
  if (skipped) return;
  $('#cmtbox').style.display = '';
 }
 $('#cmt-lock').addEventListener('click', function(){
  var t = $('#cmt-input').value.trim();
  if (!t) return;
  stored = { text: t };
  post({ type: 'commit', text: t });
  showLocked(stored);
 });
 $('#cmt-skip').addEventListener('click', function(){
  skipped = true;
  $('#cmtbox').style.display = 'none';
 });

 /* ---- debrief tie-in + You said (v7 host script) ---- */
 function decorateDebrief(){
  var d = $('#debrief');
  if (!d || !d.className.match(/\bon\b/) || document.getElementById('you-debrief-top')) return;
  var top = document.createElement('div');
  top.id = 'you-debrief-top';
  top.style.cssText = 'margin-bottom:8px;color:#C8CDD8;';
  var s = stored;
  top.innerHTML = (s ? 'You said: "' + s.text.replace(/</g,'&lt;') + '"<br>' : '') +
   '<a href="#glance" style="color:#E879F9;">Your design is now the sixth column in the comparison below ↓</a>';
  d.insertBefore(top, d.firstChild);
 }

 /* ---- R20: attack-added row tags, kept in sync on every deck repaint and level change (v7.3 script) ---- */
 function heldOf(i){
  var l = $$('#lvls .lvl')[i]; if(!l) return false;
  var d = l.querySelector('.done'); return !!(d && d.style.display && d.style.display !== 'none');
 }
 function tagRows(){
  [['kg-params',3,'ADDED BY ATTACK 4'],['kg-after',4,'ADDED BY ATTACK 5']].forEach(function(t){
   var kg = document.getElementById(t[0]); if(!kg) return;
   var lbl = kg.querySelector('.kgl'); if(!lbl) return;
   var tag = lbl.querySelector('.addtag');
   if (heldOf(t[1])){ if(tag) tag.remove(); return; }
   /* §2/A3: keep the ADDED-BY-ATTACK tag inline after the label (before the
      accordion's choice + chevron), not after the chevron. */
   if (!tag){ tag = document.createElement('span'); tag.className='addtag'; tag.textContent=t[2]; var ch = lbl.querySelector('.kgchoice'); if (ch) lbl.insertBefore(tag, ch); else lbl.appendChild(tag); }
  });
 }

 /* ---- signals: observe, never patch, the frozen engine ---- */
 function observe(el, cb, opts){ if (!el) return; var o = new MutationObserver(cb); o.observe(el, opts); cleanups.push(function(){ o.disconnect(); }); }
 observe($('#bill'), function(){ refresh(); emitState(); maybeShowCommit(); }, { attributes:true, childList:true });
 observe($('#lvls'), function(){ emitState(); tagRows(); }, { attributes:true, childList:true, subtree:true, attributeFilter:['style'] });
 observe($('#debrief'), function(){
  decorateDebrief();
  if ($('#debrief').className.match(/\bon\b/)) checkpoint('held');
 }, { attributes:true, attributeFilter:['class'] });
 observe($('#escwrap'), function(){
  var won = wonVisible();
  if (won){ filled = true; checkpoint('survived'); }
  else if (filled){ filled = false; }
  emitState();
 }, { attributes:true, attributeFilter:['style'] });
 observe($('#deck'), function(){ tagRows(); if (filled) emitState(); }, { childList:true });
 /* caused: the first finished day with damage (the meters leave "-") */
 observe($('.meters'), function(){
  var d = parseInt($('#m-dbl').textContent, 10), l = parseInt($('#m-lost').textContent, 10), t = parseInt($('#m-tick').textContent, 10);
  if (isNaN(d) || isNaN(l) || isNaN(t)) return;
  if (d + l + t > 0) checkpoint('caused');
 }, { childList:true, characterData:true, subtree:true });

 /* ---- touched: the first deck interaction (v7.3 script's deck-jump reveal, as a message) ---- */
 var deckEl = $('#deck');
 if (deckEl) deckEl.addEventListener('click', function once(){
  post({ type: 'touched' });
  deckEl.removeEventListener('click', once);
 });

 /* ---- reset: the reset button clears the saved design on the host
    (B2-1/F6). The engine's own listener resets the DOM first; this fires
    after, so the host drops decisions/survived/held while keeping commit. ---- */
 var resetEl = $('#resetbtn');
 if (resetEl) resetEl.addEventListener('click', function(){ post({ type: 'reset' }); });

 /* ---- anchors: in-page targets live in the host document ---- */
 document.addEventListener('click', function(e){
  var t = e.target;
  if (!t || !t.closest) return;
  var kl = t.closest('#log .kl');
  if (kl){
   var kg = document.getElementById('kg-' + kl.dataset.knob);
   if (kg){ var r = kg.getBoundingClientRect(); post({ type: 'anchor', frame: { top: r.top + window.pageYOffset, height: r.height } }); }
   return;
  }
  var a = t.closest('a[href^="#"]');
  if (!a) return;
  var id = a.getAttribute('href').slice(1);
  if (!id || document.getElementById(id)) return;
  e.preventDefault();
  post({ type: 'anchor', id: id });
 });

 /* ---- size: content height for the host's content-height mode. The host's
  listener may attach after this frame boots (cached assets hydrate late), so
  the size is re-posted on a short schedule as well as on every resize. ---- */
 var root = document.getElementById('mission-root');
 function postSize(){ if (root) post({ type: 'size', h: Math.ceil(root.getBoundingClientRect().height) }); }
 if (typeof ResizeObserver !== 'undefined' && root){
  var ro = new ResizeObserver(function(){ postSize(); });
  ro.observe(root);
  cleanups.push(function(){ ro.disconnect(); });
 }
 [250, 600, 1200, 2500, 5000, 10000].forEach(function(ms){ var t = setTimeout(postSize, ms); cleanups.push(function(){ clearTimeout(t); }); });

 /* ---- init from the host; standalone gets its footer backlink ---- */
 var embedded = true;
 try { embedded = window.parent !== window; } catch (e) { embedded = true; }
 if (!embedded){ var f = document.getElementById('mission-foot'); if (f) f.style.display = ''; }
 var inited = false;
 function onMessage(e){
  var d = e.data;
  if (!d || d.v !== 1 || d.wall !== WALL) return;
  try { if (e.source !== window.parent) return; } catch (err) { return; }
  if (d.type === 'init'){
   inited = true;
   if (typeof d.commit === 'string' && d.commit.trim()){ stored = { text: d.commit }; showLocked(stored); }
   /* the ONE host->mission call that mutates engine state: rebuild a saved,
      survived design without animating, then emit state so the YOU column,
      diagram and ticks fill (B2-1/F6). */
   if (d.survived && d.decisions && engine && typeof engine.restore === 'function'){
    engine.restore(d.decisions, true, Array.isArray(d.held) ? d.held : []);
    filled = true;
    emitState();
   }
  }
 }
 window.addEventListener('message', onMessage);
 cleanups.push(function(){ window.removeEventListener('message', onMessage); });

 /* ready -> init handshake: announce until the host answers (its listener
  may attach after this frame boots), then stop. */
 var readyTries = 0, readyTimer = null;
 function announce(){
  if (inited || readyTries >= 40) return;
  readyTries++;
  post({ type: 'ready' });
  readyTimer = setTimeout(announce, Math.min(2000, 150 * readyTries));
 }
 cleanups.push(function(){ clearTimeout(readyTimer); });

 postSize();
 announce();
 return function(){ cleanups.forEach(function(c){ c(); }); };
}

export default function ProblemAmbiguousTimeoutsMission() {
 useEffect(function () {
  var engine = bootEngine();
  return bootBridge(engine);
 }, []);
 return (
  <>
   <style>{CSS}</style>
   <div dangerouslySetInnerHTML={{ __html: MARKUP }} />
  </>
 );
}
