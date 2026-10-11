import { useEffect } from 'react'
import { dayTokens } from './problem-queue-backlog-rules.js'

// Problem-level artifact - "Own the queue" (build-it mission), for
// /problems/queue-backlog. The second wall's mission, ported the way page 1's
// was, from the v1.3 prototype (queue-backlog-v1.3: mission.js for the rules,
// decisions, stage, events, cards, attacks and debrief; build.py for the
// markup strings; the JSON for the eyebrow, title and sub line).
//
// Page 1's mechanics are carried into it (owner, 2026-10-10; a shared engine
// for both walls is parked until after launch), so the two missions behave
// the same:
//   - page 1's layout: two columns with the working column sticky on desktop,
//     one re-ordered column and a one-open accordion deck on phones, RUN as
//     the primary button in every motion mode (page 1's CSS, verbatim);
//   - the card slot beside the stage plus the full list in order, "-> the
//     decision" as a cue, slot jumps, fitColumn();
//   - the reading-time hold (4 words a second, never under 1.5s, real time),
//     applied when a narration or a card is REPLACED (say() and card() wait),
//     not inside every pause, because each event here is a short animated
//     phase that should keep moving while its text is read. Reduced motion
//     holds on every day and attack; normal motion on the first day only;
//   - reduced motion removes movement only: a phase jumps to its end state
//     and keeps its full length;
//   - restore(decisions, survived, held), including the four rows attacks
//     add, and the host bridge (protocol v1, commit box, checkpoints, size,
//     anchors, reset).
// Not ported (prototype only): FREE PLAY and ?free=1, the phone toast, the
// nav time budgets, the prototype's own layout. The prototype's stage drawing
// stays until the design agent's stage replaces it.
//
// Host protocol v1 (src/pages/ProblemDetail.tsx): ready · state {decisions,
// held, survived, bill} · checkpoint {caused|survived|held} · touched ·
// commit {text} · size {h} · anchor {id} | {frame} · reset; receives init.

const WALL = 'buffer-degrades-under-backlog'
const PHONE_MQ = '(max-width: 699.98px)'
const STACK_MQ = '(max-width: 934.98px)'
function mq(q) { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches }

const CSS = `
 :root {
 --art-bg: #08090D; --art-surface: #0F1118; --art-surface-2: #161922;
 --art-border: #1F2333; --art-text: #C8CDD8; --art-muted: #98A1B0; /* legibility: #6B7280 is 3.9:1 on --art-surface; this is 7.2:1 for the 9-10px labels */
 --art-border-interactive: #3a4158; --art-text-bright: #EDEFF3;
 --art-red: #ef4444; --art-amber: #eab308; --art-green: #22c55e; --art-blue: #3b82f6;
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
 .narrbox { display:flex; flex-direction:column; background:var(--art-surface-2); border:1px solid var(--art-border); border-radius:8px; padding:6px 12px; min-height:77px; }
 .narr { font-size:11.5px; line-height:1.55; }
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
 /* The column no longer caps its height or scrolls a log: the card log moved
    below both columns and the newest card sits in #slot. fitColumn() measures
    the column's content against the frame and, only when it doesn't fit,
    adds .unstuck, so a card is never cut off and nothing scrolls inside. */
 .col-right { position:sticky; top:12px; align-self:start; }
 .col-right.unstuck { position:static; }
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
 /* labels that sit on or beside a wire or pointer: a background-coloured
    outline painted under the glyphs, so the line passes behind the letters */
 svg#bstage .halo, svg#bstage .blab { paint-order:stroke; stroke:var(--art-bg); stroke-width:5px; stroke-linejoin:round; }
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
 /* The meters are one compact line at the top of the narration panel,
    right-aligned; the narration's tag sits on the same line. They cost the
    column one short line instead of a row of boxes, which is what lets the
    newest card fit beside the stage (with the RUN row they needed ~505px of
    a 485px column). */
 .meters { order:-1; display:flex; flex-wrap:wrap; justify-content:flex-end; column-gap:12px; }
 .meter { display:flex; align-items:baseline; gap:5px; white-space:nowrap; }
 .meter .n { font-size:13px; font-weight:700; color:var(--art-muted); min-width:1.2em; text-align:right; }
 .meter .n.bad { color:#ef4444; } .meter .n.good { color:#22c55e; } .meter .n.warn { color:#eab308; }
 .meter .t { font-size:9px; color:var(--art-muted); letter-spacing:.5px; }
 .meternote { flex-basis:100%; text-align:right; font-family:var(--mono); font-size:9px; letter-spacing:.5px; color:var(--art-muted); display:none; }
 .meternote.on { display:block; }

 /* #slot: the newest card (or the day's result) beside the stage. It never
    scrolls inside itself; min-height is held at the tallest card shown since
    the day started, so the column doesn't flip between sticky and not. */
 .slot { display:grid; gap:14px; align-content:start; } /* a card keeps its own height; the reserve is space below it */
 .slot:empty { display:none; }
 .bcard .shead { display:flex; align-items:baseline; gap:10px; }
 .bcard .shead .code { flex:1 1 auto; min-width:0; }
 .bcard .sjump { flex:none; margin-left:auto; color:var(--art-muted); font-size:11px; text-decoration:underline; cursor:pointer; white-space:nowrap; }
 .bcard .sjump:hover { color:var(--art-text); }
 /* below both columns, full width: THE BILL, then every card in order */
 #bill { margin-top:14px; }
 .fulllog { margin-top:14px; }
 .fl-head { color:var(--art-muted); font-size:10px; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:8px; }
 .log { display:grid; gap:14px; }
 .bcard { border-radius:8px; padding:10px 12px; font-size:12.5px; line-height:1.6; border:1px solid var(--art-border); background:var(--art-surface); }
 .bcard > div { max-width:68ch; }
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
 #cmtbox { order:-1; }     /* left column: commit before deck when stacked */
 }
 @media ${PHONE_MQ} {
 /* the vertical map is tall (360x632): cap its width so a 600-699px frame
    doesn't draw a 930px-tall stage; 390-class phones are unaffected. */
 svg#bstage { max-width:420px; margin:0 auto; }
 /* control row: buttons one line (RUN flexes). The meter strip sits on top
    of the narration panel as one line (the panel is too narrow for a side
    column on a phone). */
 .runbtn { flex:1 1 auto; }
 #stepbtn, #resetbtn { flex:0 0 auto; }

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
 .bankrow.stampin { animation: none !important; }
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
 /* queue-backlog: the commit box's storage note (v1.3 build.py) */
 .cmt-note { color:var(--art-muted); font-size:10px; margin-top:6px; }
`

const MARKUP = `
<main id="mission-root">
<div class="artB" id="artB" data-cue="run">
 <div class="a-eyebrow">WALL · BUFFER DEGRADES UNDER BACKLOG · BUILD IT</div>
 <h1 class="a-title">Own the queue <span style="font-size:9px;letter-spacing:1.5px;border:1px solid #D946EF;color:#E879F9;border-radius:5px;padding:2px 7px;vertical-align:2px;font-weight:400;">BUILD IT</span></h1>
 <div class="a-sub">You own the queue between your senders and a slower partner. Make your six decisions, then run the day. You survive it with nothing lost, nobody stalled and no outage.</div>

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
    <div class="cmt-note">Stored in the browser only.</div>
   </div>

   <div class="esc" id="escwrap" style="display:none;">
    <div class="esc-head"><span class="esc-lede">FIVE ATTACKS.</span><span class="esc-rest"> YOUR DESIGN SURVIVED A DAY. EACH ATTACK CHANGES ONE OF YOUR DECISIONS OR ADDS ONE YOU HADN&#x27;T MADE. FIX IT WITH YOUR DECISIONS, THEN RUN THE ATTACK AGAIN.</span></div>
    <div id="lvls"></div>
    <div class="debrief" id="debrief"></div>
   </div>
  </div>

  <div class="col-right">
   <div class="evchips" id="evchips"></div>
   <div class="narrbox">
    <div class="narr" id="narr" aria-live="polite"></div>
    <div class="meters" role="group" aria-label="Damage so far">
    <div class="meter"><span class="n" id="m-lost">-</span><span class="t">LOST</span></div>
    <div class="meter"><span class="n" id="m-stall">-</span><span class="t">STALLED</span></div>
    <div class="meter"><span class="n" id="m-out">-</span><span class="t">OUTAGES</span></div>
    </div>
   </div>
   <div class="bstagewrap"><svg id="bstage" viewBox="0 0 640 244" role="img" aria-label="Senders with three customers, the queue, workers, and a partner downstream. The bar in the queue fills and empties as the day runs."></svg></div>
   <div class="ctlrow">
    <button class="runbtn" id="runbtn">RUN THE DAY ▶</button>
    <button class="bghost" id="stepbtn">STEP</button>
    <button class="bghost" id="resetbtn">reset</button>
   </div>
   <div class="slot" id="slot"></div>
  </div>
 </div>
 <div class="billpanel" id="bill" style="display:none;"></div>
 <div class="fulllog" id="fulllog" style="display:none;">
  <div class="fl-head">What happened, in order</div>
  <div class="log" id="log"></div>
 </div>
</div>
</main>
`

// ---- the engine (prototype v1.3, with page 1's mechanics) ----
function bootEngine() {
 'use strict';
 var $=function(s){return document.querySelector(s);}, $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};
 var NS='http://www.w3.org/2000/svg';
 var NAIVE={ where:'mem', full:'accept', stuck:'block', order:'fifo', done:'fetch', retry:'forever' };
 var K=Object.assign({},NAIVE);
 var ROWS_ADDED={ dedupe:false, retention:false, scans:false, archive:false };
 var speed=1,curEv=-1,running=false,won=false,evIdx=0,dayDamage=null,runsDone=0,touched=false;
 var REDUCED=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var lvlDone=[false,false,false,false,false];
 var escMode=-1,curLvl=0,l1Tried=false;
 /* §2/A3 (page 1): phone accordion state -- which deck group is open. */
 var openGroup='where';

 /* dayTokens(): the RULES block, imported from ./problem-queue-backlog-rules.js (verbatim). */

 var GROUPS=[
  {k:'where',q:'',label:'WHERE: the backlog lives in&hellip;',opts:[
   ['mem','memory: fast, but emptying it needs free memory too'],
   ['log','a log on disk: in order, one worker per line'],
   ['rows','rows in a database: one row per job']]},
  {k:'full',q:'',label:'WHEN FULL: the queue&hellip;',opts:[
   ['accept','accepts everything and keeps filling'],
   ['reject','refuses new jobs, so senders get errors'],
   ['throttle','slows the senders down'],
   ['relay','overflows to a queue on disk in front, and a relay feeds jobs in at the workers\' pace']]},
  {k:'stuck',q:'',label:'STUCK JOB: a job that can never succeed&hellip;',opts:[
   ['block','blocks its line until someone notices'],
   ['requeue','goes to the back of the line'],
   ['ackaround','is set aside: progress moves past it, and a dead-letter queue keeps it for a person'],
   ['localq','is pulled into a small local queue, so only one runner waits']],
   optNeeds:{ackaround:function(){return K.done!=='fetch';}}},
  {k:'order',q:'',label:'ORDER: jobs come out&hellip;',opts:[
   ['fifo','first in, first out, in one shared line'],
   ['priority','most important first'],
   ['tenant','by a query, each customer scheduled on its own']]},
  {k:'done',q:'',label:'DONE MEANS: a job is finished when&hellip;',opts:[
   ['fetch','it is handed to a worker'],
   ['lease','the worker confirms it. If it doesn\'t confirm in time, the job is handed out again'],
   ['watermark','the worker confirms it, and progress is saved as one marker: everything done up to here']]},
  {k:'retry',q:'',label:'RETRIES: when the partner is down&hellip;',opts:[
   ['forever','keep trying at full speed until it responds'],
   ['backoff','wait longer between tries, and never give up'],
   ['cutoff','wait longer between tries, then archive after a cutoff']]},
  {k:'dedupe',q:'',label:'DUPLICATES: your workers&hellip;',needs:function(){return ROWS_ADDED.dedupe;},hideLocked:true,opts:[
   ['no','do whatever arrives'],
   ['yes','spot a job they have already done, and skip it']]},
  {k:'retention',q:'',label:'KEEP FOR: the queue on disk keeps jobs for&hellip;',needs:function(){return ROWS_ADDED.retention;},hideLocked:true,opts:[
   ['2d','two days'],['7d','a week'],['unbounded','as long as the disk lasts']]},
  {k:'scans',q:'',label:'LOOKUPS: the background queries that run the queue&hellip;',needs:function(){return ROWS_ADDED.scans;},hideLocked:true,opts:[
   ['full','read everything waiting'],['checkpoint','read only what is newer than the last checkpoint']]},
  {k:'archive',q:'',label:'PAST THE CUTOFF: archived jobs are&hellip;',needs:function(){return ROWS_ADDED.archive;},hideLocked:true,opts:[
   ['drop','gone, and nobody\'s problem'],['replay','kept, with tools to replay them by hand']]}
 ];
 var STAGEMAP={where:'sg-buf',full:'sg-full',stuck:'sg-stuck',order:'sg-order',done:'sg-done',retry:'sg-retry'};


 function paintDeck(){
  var vert=mq(PHONE_MQ); /* §2/A3 (page 1): phone shows a one-open accordion; desktop the full deck */
  var h='<div class="deck-title">YOUR DECISIONS</div><div class="deck-sub">the day runs with whatever it says here</div>';
  GROUPS.forEach(function(g){
   var ok=!g.needs||g.needs(); if(!ok&&g.hideLocked) return;
   var collapsed=vert&&openGroup!==g.k;
   var chosen='';
   if(ok){ for(var ci=0;ci<g.opts.length;ci++){ if(K[g.k]===g.opts[ci][0]){ chosen=g.opts[ci][1]; break; } } }
   h+='<div class="kg'+(collapsed?' collapsed':'')+'" id="kg-'+g.k+'">'+
    '<div class="kgl" data-acc="'+g.k+'"'+(vert?' role="button" tabindex="0" aria-expanded="'+(collapsed?'false':'true')+'"':'')+'>'+
     g.label+(g.q?' <span class="q">'+g.q+'</span>':'')+
     '<span class="kgchoice">'+chosen+'</span>'+
     '<span class="kgchev" aria-hidden="true">'+(collapsed?'\u25BE':'\u25B4')+'</span>'+
    '</div><div class="seg">';
   g.opts.forEach(function(o){
    var dis=!ok||(g.optNeeds&&g.optNeeds[o[0]]&&!g.optNeeds[o[0]]());
    h+='<button data-k="'+g.k+'" data-v="'+o[0]+'" '+(dis?'disabled':'')+' class="'+(K[g.k]===o[0]?'sel':'')+'">'+o[1]+'</button>';
   });
   h+='</div></div>';
  });
  $('#deck').innerHTML=h;
  if(escMode>=0&&LEVELS[escMode]&&LEVELS[escMode].group){var gk=document.getElementById('kg-'+LEVELS[escMode].group); if(gk) gk.classList.add('cue-target');}
  $$('#deck button[data-k]').forEach(function(b){ b.addEventListener('click',function(){
   if(running||b.disabled) return;
   touched=true; if($('#artB').dataset.cue==='deck') setCue('');
   K[b.dataset.k]=b.dataset.v;
   if(K.done==='fetch'&&K.stuck==='ackaround') K.stuck='block';
   paintDeck(); drawStage();
   var sg=document.getElementById(STAGEMAP[b.dataset.k]); if(sg){sg.classList.remove('sflash'); void sg.getBoundingClientRect(); sg.classList.add('sflash');}
   var kg=document.getElementById('kg-'+b.dataset.k); if(kg&&!kg.classList.contains('cue-target')){kg.classList.remove('flashg'); void kg.offsetWidth; kg.classList.add('flashg');}
   focusDeckSel(b.dataset.k); /* B2-7 (page 1): keep focus on the chosen option after the rebuild */
  });});
  $$('#deck .kgl[data-acc]').forEach(function(hd){
   function toggle(){ if(!mq(PHONE_MQ)) return; var k=hd.getAttribute('data-acc'); openGroup=(openGroup===k)?null:k; paintDeck(); }
   hd.addEventListener('click',toggle);
   hd.addEventListener('keydown',function(ev){ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); toggle(); } });
  });
 }
 function focusDeckSel(k){ var nb=document.querySelector('#deck button[data-k="'+k+'"].sel'); if(nb&&nb.focus) nb.focus(); }
 function setCue(v){ $('#artB').setAttribute('data-cue',v); }

 /* ---------- stage: senders | the queue | workers | partner ----------
    Drawn from the design agent's wall 2 drawings (mission-stage-h.svg 640x244,
    mission-stage-v.svg 360x514; same ids in both). Everything fixed is the
    drawing's geometry; the engine sets the decision rows, the fill bar, the
    lane bars, the counters and the stuck-job mark. The first word of each
    decision ("when full:", "stuck job:", "done =", "retries:", "receiving")
    is part of the drawing; the value fills the rows reserved below it.
    Colours on a classed text or box go through el.style (the class rule
    outranks a fill or stroke attribute). */
 var stage=$('#bstage'), S;
 var GH={ vb:'0 0 640 244', track:{x:158,y:68,w:144}, lane:{w:104},
  poison:{x:322,y:81}, spill:{x:166,y:142,w:128,ty:157} };
 var GV={ vb:'0 0 360 514', track:{x:20,y:194,w:320}, lane:{w:108},
  poison:{x:89,y:326}, spill:{x:116,y:252,w:128,ty:267} };
 var VERT=false,G=GH;
 function el(name,attrs,parent,text){var e=document.createElementNS(NS,name);for(var k in attrs)e.setAttribute(k,attrs[k]);if(text!==undefined)e.textContent=text;(parent||stage).appendChild(e);return e;}
 var SIM={backlog:8,cap:100,drainCap:30,arr:14,waitA:0,waitB:0,waitC:0,partner:'up',spill:0};
 /* the decision values, one array entry per row (the drawing's breaks) */
 var QSUB={mem:'in memory',log:'log on disk',rows:'database rows'};
 var FULLV={accept:'keep accepting',reject:'refuse new jobs',throttle:'slow the senders',relay:'overflow to disk'};
 var STUCKV={block:'blocks the line',requeue:'back of the line',ackaround:'set aside',localq:'local queue'};
 var DONEV={fetch:['handed out'],lease:['confirmed,','time limit'],watermark:['confirmed,','marker']};
 var RETRYV={forever:['full speed'],backoff:['wait longer'],cutoff:['wait, then','cut off']};
 var LANEV={tenant:'own schedule',priority:'by priority',fifo:'shared line'};
 function sub(x,y,parent,text,attrs){ var a={class:'nsub',x:x,y:y}; for(var k in attrs) a[k]=attrs[k]; return el('text',a,parent,text); }
 function rows(x,y0,parent,lines){ lines.forEach(function(t,i){ sub(x,y0+16*i,parent,t); }); }
 function drawStage(){
  stage.innerHTML=''; S=el('g',{});
  var lanes=['A','B','C'], laneTxt=LANEV[K.order]||LANEV.fifo;
  var wires=VERT?[[180,106,180,140],[89,308,89,344],[170,388,190,388]]:[[126,81,150,81],[310,81,334,81],[486,81,510,81]];
  wires.forEach(function(w){ el('line',{class:'wire',x1:w[0],y1:w[1],x2:w[2],y2:w[3]},S); });
  /* senders + the three customer lanes */
  var gP=el('g',{id:'sg-order'},S);
  if(VERT){ el('rect',{class:'nodebox',x:8,y:14,width:344,height:92,rx:8},gP); el('text',{class:'nlab',x:180,y:36},gP,'SENDERS'); }
  else { el('rect',{class:'nodebox',x:6,y:14,width:120,height:190,rx:8},gP); el('text',{class:'nlab',x:66,y:36},gP,'SENDERS'); }
  lanes.forEach(function(t,i){
   var lx=VERT?12+114*i:14, ly=VERT?64:64+52*i, lw=G.lane.w;
   sub(lx,ly-6,gP,'customer '+t,{style:'text-anchor:start'});
   el('rect',{id:'lane'+t,x:lx,y:ly,width:lw,height:10,rx:3,fill:'var(--art-surface-2)',stroke:'var(--art-border)'},gP);
   el('rect',{id:'lanefill'+t,x:lx,y:ly,width:0,height:10,rx:3,fill:'#6B7280'},gP);
   sub(lx+lw/2,ly+26,gP,laneTxt,{id:'lanetxt'+t});
  });
  /* the queue */
  var T=G.track, cx=VERT?180:230;
  var gB=el('g',{id:'sg-buf'},S);
  if(VERT){ el('rect',{class:'nodebox',id:'bufbox',x:8,y:140,width:344,height:168,rx:8},gB); el('text',{class:'nlab',x:180,y:162},gB,'THE QUEUE'); sub(180,182,gB,QSUB[K.where]); }
  else { el('rect',{class:'nodebox',id:'bufbox',x:150,y:14,width:160,height:212,rx:8},gB); el('text',{class:'nlab',x:230,y:36},gB,'THE QUEUE'); sub(230,56,gB,QSUB[K.where]); }
  el('rect',{x:T.x,y:T.y,width:T.w,height:26,rx:5,fill:'var(--art-surface-2)',stroke:'var(--art-border)'},gB);
  el('rect',{id:'bufill',x:T.x,y:T.y,width:0,height:26,rx:5,fill:'var(--art-blue)'},gB);
  sub(cx,T.y+18,gB,'',{id:'buftxt',class:'nsub halo',style:'fill:var(--art-text-bright)'});
  /* when full (phone: one line) + the overflow box */
  var gF=el('g',{id:'sg-full'},S);
  if(VERT) sub(180,242,gF,'when full: '+FULLV[K.full]);
  else { sub(230,116,gF,'when full:'); sub(230,132,gF,FULLV[K.full]); }
  if(K.full==='relay'){ var SP=G.spill; el('rect',{x:SP.x,y:SP.y,width:SP.w,height:22,rx:5,fill:'var(--art-surface)',stroke:'var(--art-border)'},gF); sub(cx,SP.ty,gF,'on disk: 0',{id:'spilltxt'}); }
  /* stuck job + its mark (drawn by poison() on the wire into WORKERS) */
  var gS=el('g',{id:'sg-stuck'},S);
  if(VERT) sub(180,296,gS,'stuck job: '+STUCKV[K.stuck]);
  else { sub(230,186,gS,'stuck job:'); sub(230,202,gS,STUCKV[K.stuck]); }
  el('g',{id:'poisonmark'},gS);
  /* workers */
  var dx=VERT?89:410, dy=VERT?344:14;
  var gD=el('g',{id:'sg-done'},S);
  el('rect',{class:'nodebox',id:'drainbox',x:VERT?8:334,y:dy,width:VERT?162:152,height:VERT?156:140,rx:8},gD);
  el('text',{class:'nlab',x:dx,y:dy+22},gD,'WORKERS');
  sub(dx,dy+44,gD,'',{id:'draintxt'});
  sub(dx,dy+68,gD,'done =');
  rows(dx,dy+84,gD,DONEV[K.done]);
  sub(dx,dy+126,gD,'',{id:'dupetxt',style:'fill:var(--art-amber)'});
  /* partner */
  var wx=VERT?271:572;
  var gR=el('g',{id:'sg-retry'},S);
  el('rect',{class:'nodebox',id:'downbox',x:VERT?190:510,y:dy,width:VERT?162:124,height:VERT?156:160,rx:8},gR);
  el('text',{class:'nlab',x:wx,y:dy+22},gR,'PARTNER');
  sub(wx,dy+44,gR,'up',{id:'downtxt',style:'fill:var(--art-green)'});
  sub(wx,dy+68,gR,'retries:');
  rows(wx,dy+84,gR,RETRYV[K.retry]);
  sub(wx,dy+126,gR,'receiving');
  sub(wx,dy+142,gR,'0/s',{id:'rpstxt'});
  paintSim();
 }
 function paintSim(){
  var pct=Math.min(1,SIM.backlog/SIM.cap);
  var f=document.getElementById('bufill'); if(f){ f.setAttribute('width',G.track.w*pct); f.style.fill=SIM.seized?'var(--art-red)': pct>0.7?'var(--art-amber)':'var(--art-blue)'; }
  var t=document.getElementById('buftxt'); if(t) t.textContent=(SIM.seized?'LOCKED ':'')+Math.round(SIM.backlog)+(K.where==='mem'?'/'+SIM.cap:' waiting');
  var sp=document.getElementById('spilltxt'); if(sp) sp.textContent='on disk: '+Math.round(SIM.spill);
  var d=document.getElementById('draintxt'); if(d) d.textContent='draining '+Math.round(SIM.drainNow||0)+'/s';
  ['A','B','C'].forEach(function(x){ var lf=document.getElementById('lanefill'+x); if(!lf) return; var w=Math.min(1,(SIM['wait'+x]||0)/60); lf.setAttribute('width',G.lane.w*w); lf.style.fill=w>0.5?'var(--art-red)':'#6B7280'; });
  var dn=document.getElementById('downtxt'); if(dn){ dn.textContent=SIM.partner; dn.style.fill=SIM.partner==='up'?'var(--art-green)':'var(--art-red)'; }
  var rp=document.getElementById('rpstxt'); if(rp) rp.textContent=Math.round(SIM.rps||0)+'/s';
 }
 /* the workers box outline: red while the workers are hurt, the class's own
    colour otherwise (style, because .nodebox outranks a stroke attribute) */
 function drainAlert(on){ var d=document.getElementById('drainbox'); if(d) d.style.stroke=on?'var(--art-red)':''; return d; }
 function pickG(){ VERT=mq(PHONE_MQ); G=VERT?GV:GH; stage.setAttribute('viewBox',G.vb); }
 pickG(); window.addEventListener('resize',function(){var v=mq(PHONE_MQ); if(v!==VERT&&!running){pickG();drawStage();}});


 /* ---------- time: pauses, phases, and the reading-time hold ----------
    Reduced motion removes movement and nothing else (page 1's rule): a phase
    jumps to its end state and keeps its full length; dwells and pauses keep
    theirs. The reading-time hold (page 1: 4 words a second, never under
    1.5s, real time) applies when a narration or a card is REPLACED: say()
    and card() wait until the text they replace has had its reading time.
    It holds on every day and attack under reduced motion, and on the first
    day only in normal motion (holdDay is fixed when a day starts). */
 function sleep(ms){ return new Promise(function(r){setTimeout(r,ms/speed);}); }
 function dwell(ms){ return new Promise(function(r){setTimeout(r,ms);}); } /* real time, never speed-divided */
 async function phase(n,fn,ms){
  ms=ms||130;
  if(REDUCED){ for(var j=0;j<n;j++) fn(SIM,j); paintSim(); await sleep(n*ms); return; }
  for(var i=0;i<n;i++){ fn(SIM,i); paintSim(); await sleep(ms); }
 }
 var READ_WPS=4, READ_MIN_MS=1500, readBy={ narr:0, slot:0 }, holdDay=true, dayOn=false;
 function holding(){ return REDUCED||(dayOn&&holdDay); }
 function readMs(text){ var n=(String(text).match(/\S+/g)||[]).length; return Math.max(READ_MIN_MS, n*1000/READ_WPS); }
 function holdToRead(where,text){ readBy[where]=text?Date.now()+readMs(text):0; }
 function textOf(n){ return (n.innerText!==undefined&&n.innerText!==''?n.innerText:n.textContent)||''; } /* innerText keeps the spaces between elements */
 function readUntil(where){ var w=readBy[where]-Date.now(); return w>0?dwell(w):Promise.resolve(); }
 function sayNow(tag,html){ $('#narr').innerHTML='<span class="tag">'+tag+'</span> \u00b7 '+html; holdToRead('narr',textOf($('#narr'))); }
 async function say(tag,html){ if(holding()) await readUntil('narr'); sayNow(tag,html); }
 function stamp(kind,txt){ var host=document.getElementById(kind); if(!host) return; host.textContent=txt; }
 function poison(on){ var g=document.getElementById('poisonmark'); if(!g) return; g.innerHTML=''; if(!on) return; var p=G.poison; el('circle',{cx:p.x,cy:p.y,r:7,fill:'var(--art-red)'},g); el('text',{x:p.x,y:p.y+4.5,'text-anchor':'middle','font-size':'12','font-weight':'700',fill:'var(--art-bg)'},g,'!'); }

 /* ---------- cards: the slot beside the stage + the full list (page 1) ---------- */
 var QOF={where:'q1',full:'q3',stuck:'q4',order:'q5',done:'q6',retry:'q7',dedupe:'q6',retention:'q7',scans:'q2',archive:'q7'};
 function buildCard(cls,code,body,src,knob,jump){
  var d=document.createElement('div'); d.className='bcard '+cls;
  d.innerHTML='<div class="shead"><span class="code">'+code+'</span>'+(jump||'')+'</div><div>'+body+(knob?' <span class="kl" data-knob="'+knob+'">\u2192 the decision</span> \u00b7 <a class="khint" href="#'+(QOF[knob]||'q1')+'">hint \u2193</a>':'')+'</div>'+(src?'<div class="src">'+src+'</div>':'');
  d.querySelectorAll('.kl').forEach(function(k){ k.addEventListener('click',function(){ cueDecision(k.dataset.knob); }); });
  return d;
 }
 function jumpTo(target,label){ return '<a class="sjump" href="#'+target+'" data-target="'+target+'">'+label+'</a>'; }
 function listJump(){ var n=$('#log').children.length; return jumpTo('fulllog', n===1?'1 card \u2193':'all '+n+' cards \u2193'); }
 var slotMax=0;
 function showSlot(d){
  var slot=$('#slot'); slot.innerHTML=''; slot.appendChild(d); holdToRead('slot',textOf(d));
  var h=slot.getBoundingClientRect().height;
  if(h>slotMax){ slotMax=h; slot.style.minHeight=slotMax+'px'; }
  fitColumn();
 }
 function clearSlot(){ $('#slot').innerHTML=''; holdToRead('slot',''); fitColumn(); }
 async function card(cls,code,body,src,knob){
  $('#log').appendChild(buildCard(cls,code,body,src,knob));
  $('#fulllog').style.display='';
  if(holding()) await readUntil('slot');
  showSlot(buildCard(cls,code,body,src,knob,listJump()));
 }
 function fitColumn(){
  var col=$('.col-right'); if(!col) return;
  if(mq(STACK_MQ)){ col.classList.remove('unstuck'); return; }
  var need=col.getBoundingClientRect().height, avail=window.innerHeight-24;
  col.classList.toggle('unstuck', need>avail);
 }
 if(typeof ResizeObserver!=='undefined') new ResizeObserver(fitColumn).observe($('.col-right'));
 window.addEventListener('resize',function(){ slotMax=0; $('#slot').style.minHeight=''; fitColumn(); });
 /* "-> the decision" cues the group (page 1, F13/A2): no page scroll unless
    the group is fully off-screen; on phone it opens the accordion first and
    the host scrolls the page (bridge anchor). */
 function cueDecision(knob){
  var kg=document.getElementById('kg-'+knob); if(!kg) return;
  if(mq(PHONE_MQ)){ openGroup=knob; paintDeck(); kg=document.getElementById('kg-'+knob); if(!kg) return; }
  var artB=$('#artB');
  var attackActive=escMode>=0;
  var attackGroup=(attackActive&&LEVELS[escMode])?LEVELS[escMode].group:null;
  var isAttackGroup=!!attackGroup&&('kg-'+attackGroup)===kg.id;
  var useCue=!attackActive||isAttackGroup;
  function flash(){
   if(useCue){
    var saved=artB.dataset.cue;
    kg.classList.add('cue-target'); artB.dataset.cue='group';
    setTimeout(function(){ if(artB.dataset.cue==='group') artB.dataset.cue=saved; kg.classList.remove('cue-target'); },1600);
   } else { kg.classList.remove('flashg'); void kg.offsetWidth; kg.classList.add('flashg'); }
  }
  var r=kg.getBoundingClientRect();
  var offscreen=r.bottom<=0||r.top>=window.innerHeight;
  if(!offscreen){ flash(); return; }
  var done=false;
  function arrive(){ if(done) return; done=true; window.removeEventListener('scrollend',arrive); flash(); }
  window.addEventListener('scrollend',arrive);
  setTimeout(arrive,400);
  window.scrollTo({ top:Math.max(0, r.top+window.pageYOffset-window.innerHeight*0.3), behavior:REDUCED?'auto':'smooth' });
 }

 var EVMETA=[{chip:'1 · STEADY'},{chip:'2 · WORKERS SLOW'},{chip:'3 · STUCK JOB'},{chip:'4 · BIG CUSTOMER'},{chip:'5 · WORKER CRASH'},{chip:'6 · PARTNER DOWN'}];
 var EVENTS=[
  async function routine(){
   await say('EVENT 1/6','Steady traffic. Fourteen jobs a second arrive, and the workers can do thirty. The queue barely notices it is there.');
   await phase(12,function(s){ s.backlog=Math.max(2,s.backlog+14*0.15-30*0.15); s.drainNow=Math.min(30,14+s.backlog); });
   return {cls:'good'};
  },
  async function slowdown(t){
   await say('EVENT 2/6','<b>The workers slow to a fifth of their speed</b>, because the database behind them is overloaded. Jobs keep arriving at the same rate. Watch the queue.');
   var d=drainAlert(true);
   if(t==='SEIZED'){
    await phase(22,function(s){ var eff=Math.max(0.2,1-(s.backlog/s.cap)*0.8); var dr=6*0.15*eff; s.backlog=Math.min(s.cap,s.backlog+14*0.15-dr); s.drainNow=dr/0.15; if(s.backlog>=s.cap-0.5){s.seized=true;s.drainNow=0;} });
    await dwell(900);
    await say('EVENT 2/6','Full. And <b>a full queue can\'t empty itself</b>: taking a job out needs a little free memory, and the backlog has used it all. Watch: the slowdown ends, and the queue stays locked.');
    await phase(8,function(s){ s.drainNow=0; }); drainAlert(false); await phase(6,function(s){ s.drainNow=0; });
    await card('bad','LOCKED: THE QUEUE TOOK THE SITE DOWN','The queue (Redis) filled its memory, and taking a job out needed free memory. Every feature that depends on the queue failed. The slowdown was fixed and the queue stayed locked. Getting it back took a lot of manual work.','Slack 2017.','where');
    SIM.seized=false; SIM.backlog=8; return {cls:'bad'};
   }
   if(t==='REJECTED'){
    await phase(16,function(s){ s.backlog=Math.min(s.cap,s.backlog+14*0.15-6*0.15); s.drainNow=6; });
    await dwell(900);
    await say('EVENT 2/6','Full, and now the queue <b>turns senders away</b>. Every job that arrives is an error someone upstream has to handle.');
    await phase(8,function(s){ s.drainNow=6; s.rejected=(s.rejected||0)+2; });
    await card('bad','JOBS REFUSED AT THE DOOR','The queue protected itself by refusing the jobs it exists to hold. Messages, notifications and everything else behind it failed loudly.','Slack 2017: at the memory limit, no new job could be added.','full');
    drainAlert(false); SIM.backlog=8; return {cls:'bad'};
   }
   if(t==='UPSTREAM'){
    await phase(14,function(s){ s.backlog=Math.min(s.cap*0.8,s.backlog+14*0.15-6*0.15); s.drainNow=6; });
    await say('EVENT 2/6','The queue <b>slows its senders down</b> to protect itself. They feel it as network delay they can\'t explain, and their own requests pile up. Then a timeout kills the slowed processes over and over, and their restarts flood the queue with reconnections.');
    ['A','B','C'].forEach(function(x){SIM['wait'+x]=50;}); await phase(10,function(s){ s.drainNow=4; }); await dwell(900);
    await card('bad','THE TROUBLE MOVED UPSTREAM','Flow Control slowed the app servers. A timeout setting on them (harakiri) kept killing and restarting their slowed processes, and the reconnections loaded the queue even more. The slowdown fed itself.','DoorDash 2020.','full');
    ['A','B','C'].forEach(function(x){SIM['wait'+x]=0;}); drainAlert(false); SIM.backlog=8; return {cls:'bad'};
   }
   if(t==='CLEAN_SPILL'){
    await phase(20,function(s){ s.spill+=14*0.15-6*0.15; s.backlog=Math.min(s.cap*0.55,s.backlog+0.2); s.drainNow=6; });
    await say('EVENT 2/6','The queue stays at a level the workers can handle. The extra lands in <b>a queue on disk in front</b>: a number on disk, not a full queue in memory. Nothing refused, nothing locked.');
    drainAlert(false); await phase(8,function(s){ s.spill=Math.max(0,s.spill-3); s.drainNow=30; });
    await card('good','SURVIVED: THE BACKLOG BECAME A NUMBER ON DISK','Kafka took every job as fast as it arrived, and a relay fed jobs into Redis under a rate limit. A build-up now means turning a dial, not hours of manual work. The cost is on the bill: two systems, and someone owns the dial.','Slack 2017.',null);
    SIM.spill=0; return {cls:'good'};
   }
   /* CLEAN_DELAY */
   await phase(20,function(s){ s.backlog=s.backlog+14*0.15-6*0.15; s.drainNow=6; });
   await say('EVENT 2/6','The backlog grows, and nothing else happens. A queue on disk takes everything, so the failure downstream becomes <b>delay, not loss</b>.');
   drainAlert(false); await phase(8,function(s){ s.backlog=Math.max(6,s.backlog-4); s.drainNow=30; });
   await card('good','SURVIVED: DELAY, NOT LOSS','Senders kept adding jobs, the jobs were kept, and the workers caught up later. Meta\'s queue has held backlogs of hundreds of billions this way. That is the design working. The cost: a backlog is now normal, and everything downstream has to live with the delay.','Meta 2021.',null);
   SIM.backlog=8; return {cls:'good'};
  },
  async function poisonpill(t){
   await say('EVENT 3/6','<b>A job arrives that can never succeed</b>: a permanent error, not a passing one (a poison pill). It reaches the front of its line.');
   poison(true); await sleep(700);
   if(t==='HOL_STALL'){
    await say('EVENT 3/6','One line, one worker, and each job must finish before the next. The healthy jobs behind it <b>wait forever</b>.');
    await phase(16,function(s){ s.backlog+=14*0.15; s.drainNow=0; s.waitB=Math.min(60,(s.waitB||0)+5); s.waitC=Math.min(60,(s.waitC||0)+5); }); await dwell(900);
    await card('bad','HELD UP BY ONE STUCK JOB','A job that can never succeed blocked its line, and every healthy job behind it waited. This is head-of-line blocking. Uber\'s post describes exactly this: a job that can\'t be processed leaves the worker stuck, and the healthy job behind it waits.','Uber 2021.','stuck');
    poison(false); SIM.waitB=0; SIM.waitC=0; SIM.backlog=8; return {cls:'bad'};
   }
   if(t==='CLEAN_REQUEUE'||t==='CLEAN_REQUEUE_LOOP'){
    await say('EVENT 3/6','The stuck job goes <b>to the back of the line</b>, and the line moves. '+(t==='CLEAN_REQUEUE_LOOP'?'With retries at full speed forever, it will be back at the front soon, again and again.':'Waiting longer between tries spaces out its returns.'+(K.retry==='cutoff'?' The cutoff will end them.':'')));
    await phase(12,function(s){ s.backlog=Math.max(6,s.backlog-2); s.drainNow=28; }); poison(false);
    await card('good','SURVIVED: THE LINE KEPT MOVING', t==='CLEAN_REQUEUE_LOOP'?'The stuck job circles forever, using up the workers on every lap. That cost is on the bill.':'The stuck job steps aside and the others pass. Slack retries a failing job a set number of times, then moves it to a list of failed jobs.','Slack 2017.',null);
    return {cls:'good'};
   }
   if(t==='CLEAN_DLQ'){
    await say('EVENT 3/6','The worker <b>refuses it with a code</b>. The proxy parks it in a dead-letter queue, a side queue a person checks, and the marker of everything done up to here <b>moves past it</b>.');
    await phase(12,function(s){ s.backlog=Math.max(6,s.backlog-2); s.drainNow=28; }); poison(false);
    await card('good','SURVIVED: SET ASIDE, NOT FIXED','The stuck job no longer holds up everything behind it. But it isn\'t fixed: it waits in the dead-letter queue for a person. That cost is on the bill.','Uber 2021: the dead-letter queue turns blocking into waiting, not into a fix.',null);
    return {cls:'good'};
   }
   await say('EVENT 3/6','One process pulls jobs into a <b>small local queue</b>, and several runners take from it. The stuck job ties up one runner while the line keeps moving.');
   await phase(12,function(s){ s.backlog=Math.max(6,s.backlog-2); s.drainNow=24; }); poison(false);
   await card('good','SURVIVED: ONE RUNNER WAITS, NOT THE LINE','Fetching is separate from running. The cap on the local queue limits what a crash can lose: a small window, accepted to keep things simple.','DoorDash 2020.',null);
   return {cls:'good'};
  },
  async function whale(t){
   await say('EVENT 4/6','<b>Customer A sends 50,000 jobs in a burst</b>, to a partner that takes 1,000 a second from any one customer. B and C sent three each.');
   await phase(10,function(s){ s.backlog+=40; s.waitA=60; s.drainNow=16; });
   if(t==='CLEAN_ISOLATED'){
    await say('EVENT 4/6','Order is a query. <b>A is scheduled on its own</b>, and B and C are delivered as if A weren\'t there.');
    await phase(12,function(s){ s.waitB=0; s.waitC=0; s.waitA=Math.max(30,s.waitA-2); s.backlog=Math.max(8,s.backlog-3); });
    await card('good','SURVIVED: THE BIG CUSTOMER WAITED ALONE','Each customer is scheduled on its own, over rows. B and C never saw A\'s flood. The separation lives in the scheduling code, and that cost is on the bill.','Segment 2018.',null);
    SIM.waitA=0; return {cls:'good'};
   }
   if(t==='STALL_SAME_PRIORITY'){
    await say('EVENT 4/6','Priority decides who goes first, and A, B and C are all <b>the same priority</b>. Priority separates urgent from routine. It doesn\'t separate customers.');
    await phase(14,function(s){ s.waitB=Math.min(60,(s.waitB||0)+5); s.waitC=Math.min(60,(s.waitC||0)+5); s.drainNow=16; }); await dwell(900);
    await card('bad','B AND C STUCK BEHIND A: PRIORITY DIDN\'T HELP','Most important first is a different promise from every customer keeps moving. A\'s 50,000 routine jobs and B\'s three routine jobs are equals in a priority queue.','Segment 2018 (the burst). Meta 2021 uses priority for a different problem.','order');
    SIM.waitA=0; SIM.waitB=0; SIM.waitC=0; return {cls:'bad'};
   }
   await say('EVENT 4/6','One shared line. B and C are <b>50 seconds behind A</b>. Every way out is bad: cap A and delay customers who did nothing wrong, keep sending and burn retries against the limit, or copy terabytes to a side queue.');
   await phase(14,function(s){ s.waitB=Math.min(60,(s.waitB||0)+5); s.waitC=Math.min(60,(s.waitC||0)+5); s.drainNow=16; }); await dwell(900);
   await card('bad','CUSTOMERS STUCK BEHIND ONE BIG BURST','One customer\'s burst became everyone\'s wait. The order was fixed when the jobs were written, so moving anyone ahead of A means rewriting the data.','Segment 2018.','order');
   SIM.waitA=0; SIM.waitB=0; SIM.waitC=0; SIM.backlog=8; return {cls:'bad'};
  },
  async function crash(t){
   await say('EVENT 5/6','<b>A worker crashes</b> holding a job it was handed but hadn\'t finished.');
   var d=drainAlert(true); if(d) d.classList.add('bpulse'); await sleep(800); if(d) d.classList.remove('bpulse'); drainAlert(false);
   if(t==='LOST_ITEM'){
    await say('EVENT 5/6','The job was marked done when it was <b>handed out</b>. Nothing knows it wasn\'t finished. It is gone.');
    await dwell(900);
    await card('bad','A JOB VANISHED','Marked done when handed out, never finished. In a billing queue, that is a charge silently dropped.','Uber 2021: marking a job done on hand-out turns a blockage into lost data.','done');
    return {cls:'bad'};
   }
   await say('EVENT 5/6','No confirmation came, so the job is <b>handed out again</b>, to a worker that is alive. A slow worker would have looked exactly like a dead one, and its job would arrive twice.');
   stamp('dupetxt','handed out again'); await phase(8,function(s){ s.drainNow=28; }); stamp('dupetxt','');
   await card('good','SURVIVED: HANDED OUT AGAIN, NOT LOST','Nobody confirmed the job, so it came back. Now every worker has to cope with seeing the same job twice. That cost is on the bill.','Meta 2021, Uber 2021.',null);
   return {cls:'good'};
  },
  async function partner(t){
   await say('EVENT 6/6','<b>The partner slows and starts failing</b> for 105 minutes. Most deliveries fail. The queue soaks up about 85 million events.');
   SIM.partner='DOWN'; await phase(12,function(s){ s.backlog+=6; s.drainNow=0; s.rps=0; });
   SIM.partner='recovering';
   if(t==='STORM'){
    await say('EVENT 6/6','It comes back. Every retry fires <b>at full speed, at once</b>.');
    await phase(12,function(s){ s.rps=Math.min(100000,(s.rps||0)+12000); s.backlog=Math.max(8,s.backlog-4); s.drainNow=30; }); await dwell(900);
    await card('bad','RETRY STORM: 100,000 A SECOND AT A PARTNER THAT NORMALLY TAKES 16,000','The queue that soaked up the outage became a second problem for the partner. A queue that never gives up has to decide how hard to keep knocking.','Segment 2018: its requests peaked at about six times the partner\'s normal load.','retry');
    SIM.rps=0; SIM.partner='up'; return {cls:'bad'};
   }
   await say('EVENT 6/6','It comes back. Retries return <b>with longer and longer waits between them</b>. The first burst still lands, then the curve smooths. The whole backlog is delivered within 30 minutes of recovery.'+(t==='CLEAN_CUTOFF'?' The outage never reached the four-hour cutoff, so nothing was archived.':''));
   await phase(12,function(s){ s.rps=Math.max(4000,20000-1500*(s.rps===undefined?0:1)); s.backlog=Math.max(8,s.backlog-5); s.drainNow=30; });
   await card('good','SURVIVED: DELIVERED LATE', t==='CLEAN_CUTOFF'?'About 85 million events soaked up and delivered within 30 minutes of recovery. Nothing reached the four-hour cutoff this time. Anything that does is archived, not delivered.':'About 85 million events soaked up and delivered within 30 minutes of recovery. Late is the cost, and the partner still took a first burst.','Segment 2018.',null);
   SIM.rps=0; SIM.partner='up'; return {cls:'good'};
  }
 ];


 /* ---------- run control ---------- */
 function chips(){ var h=''; EVMETA.forEach(function(m,i){h+='<div class="evchip" data-i="'+i+'">'+m.chip+'</div>';}); $('#evchips').innerHTML=h; }
 function meters(d){ function set(id,v,bad){var el2=$(id); el2.textContent=v; el2.className='n '+(v===0?'good':bad);} set('#m-lost',d.lost,'bad'); set('#m-stall',d.stalled,'bad'); set('#m-out',d.outage,'bad'); }
 function lock(on){ $('#artB').classList.toggle('locked',on); $('#runbtn').disabled=on; $('#stepbtn').disabled=on; }
 async function playEvent(i){ curEv=i; var t=dayDamage.ev[i].t; var chip=$('.evchip[data-i="'+i+'"]'); chip.classList.add('now'); var res=await EVENTS[i](t); chip.classList.remove('now'); chip.classList.add(res.cls==='good'?'clean':'hurt'); await sleep(500); }
 function freshDay(){
  dayDamage=dayTokens(K); evIdx=0; holdDay=runsDone===0; /* the first day reads at reading pace in both modes */
  SIM={backlog:8,cap:100,drainCap:30,arr:14,waitA:0,waitB:0,waitC:0,partner:'up',spill:0};
  $('#log').innerHTML=''; $('#fulllog').style.display='none'; clearSlot(); chips(); drawStage();
  ['#m-lost','#m-stall','#m-out'].forEach(function(s){$(s).textContent='-';$(s).className='n';});
 }
 function renderBill(bill){ var host=$('#bill'); if(!bill||!bill.length){host.style.display='none';return;} host.style.display=''; host.innerHTML='<div class="billhead">THE BILL: what your design pays to survive</div>'+bill.map(function(b){return '<div class="billrow'+(b.base?' base':'')+'">'+(b.base?'<span class="bl">BASELINE</span> ':'')+b.c+' <span class="bs">'+b.s+'</span></div>';}).join(''); }
 async function finishDay(){
  runsDone++; var rb=$('#runbtn'); rb.innerHTML='RUN AGAIN \u25B6'; setCue(dayDamage.win?'':'deck');
  meters(dayDamage); renderBill(dayDamage.win?dayDamage.bill:null);
  if(dayDamage.win){
   await say('DAY SURVIVED','Nothing lost, nobody stalled, no outage, and a bill. Every queue pays something, and yours is itemized. Now hold it: <b>the five attacks below are real failures that queues like yours still hit.</b>');
   var survivedBody='Nothing lost, nobody stalled, no outage. The bill lists what this design pays for that, each line named by the company that paid it first.';
   $('#log').appendChild(buildCard('good','DAY SURVIVED',survivedBody,'',null)); $('#fulllog').style.display='';
   if(holding()) await readUntil('slot');
   showSlot(buildCard('good','DAY SURVIVED',survivedBody,'',null,jumpTo('bill','THE BILL \u2193'))); /* page 1: the slot's day result points at the bill (shown once) */
   if(!won){won=true;buildLevels();} $('#escwrap').style.display=''; setCue('');
  } else {
   var over='See what broke. Each result points at one of your decisions. The comparison below shows how the five companies handled it. Change a decision and run again.';
   await say('DAY OVER',over);
   if(holding()) await readUntil('slot');
   showSlot(buildCard('bad','DAY OVER',over,'',null,listJump())); /* page 1: slot only, not one more card in the list */
  }
 }
 async function runAll(){
  if(running) return;
  if(escMode>=0){ sayNow('ATTACK ACTIVE','Finish the attack first: fix it with your decisions and run it again. The day can wait.'); return; }
  running=true; lock(true); setCue(''); freshDay(); dayOn=true;
  for(var i=0;i<6;i++) await playEvent(i);
  await finishDay(); dayOn=false; lock(false); running=false;
 }
 async function stepOne(){
  if(running) return;
  if(escMode>=0){ sayNow('ATTACK ACTIVE','Finish the attack first.'); return; }
  if(evIdx===0||evIdx>=6) freshDay();
  running=true; lock(true); setCue(''); dayOn=true;
  await playEvent(evIdx); evIdx++;
  if(evIdx>=6) await finishDay(); else await say('PAUSED','Event '+evIdx+' of 6 done. Press STEP for the next.');
  dayOn=false; lock(false); running=false;
 }

 /* ---------- attacks ---------- */
 var LEVELS=[
  {t:'A1 · UBER: A DEPLOY RESHUFFLES THE WORKERS',group:'dedupe',
   brief:'Whenever a worker joins or leaves, Kafka pauses and reassigns which worker reads which line. How you track progress decides what comes back.',
   attack:async function(){
    if(K.done==='watermark'){ await say('ATTACK 1','A deploy restarts the workers, and the lines are reassigned. Jobs that were <b>confirmed but not yet under the marker</b> are delivered again.'); ROWS_ADDED.dedupe=true; if(!K.dedupe) K.dedupe='no'; LEVELS[0].group='dedupe'; openGroup='dedupe'; paintDeck(); focusDeckSel('dedupe'); stamp('dupetxt','delivered twice'); await sleep(900); await card('bad','DONE TWICE AFTER THE RESHUFFLE','Progress lived in two places: the proxy knew these jobs were done, but Kafka only knew the marker. The jobs in between came back and were done twice. A new decision appeared: what your workers do with a repeat.','Uber 2021.','dedupe'); await say('ATTACK 1','Decide what your workers do with a repeat, then run the attack again.'); }
    else if(K.done==='fetch'){ LEVELS[0].group='done'; paintDeck(); await say('ATTACK 1','A deploy restarts the workers. Jobs marked done when handed out were still in progress. They are <b>gone</b>.'); await sleep(900); await card('bad','LOST IN THE RESHUFFLE','Marked done when handed out, never finished, and never coming back.','Uber 2021: marking a job done on hand-out turns a blockage into lost data.','done'); await say('ATTACK 1','Change what done means, then run the attack again.'); }
    else { LEVELS[0].group='done'; paintDeck(); await say('ATTACK 1','A deploy restarts the workers. Jobs whose workers died <b>come back when their time limit runs out</b>, to live workers.'); await sleep(900); await say('ATTACK 1','Nothing lost, and some jobs seen twice, a cost already on your bill. Run it again to confirm it holds.'); }
    stamp('dupetxt','');
   },
   rerun:async function(){
    if(K.done==='fetch'){ stamp('dupetxt','lost'); await sleep(700); stamp('dupetxt',''); await card('bad','STILL LOSING JOBS ON RESTART','Marking a job done on hand-out leaves no way to know it wasn\'t finished.','Uber 2021.','done'); return {held:false}; }
    if(K.done==='watermark'&&K.dedupe!=='yes'){ stamp('dupetxt','done twice'); await sleep(700); stamp('dupetxt',''); await card('bad','BROKE AGAIN: REPEATS DONE TWICE','Jobs confirmed but not yet under the marker came back, and nothing downstream recognized them.','Uber 2021.','dedupe'); return {held:false}; }
    stamp('dupetxt','repeat skipped ✓'); await sleep(700); stamp('dupetxt','');
    await card('good','HELD: REPEATS SPOTTED AND SKIPPED', K.done==='watermark'?'Jobs may arrive more than once, and your workers skip the repeats. That habit has to hold forever. That cost is on the bill.':'The time limit turned the restart into a second delivery, and your workers already cope with seeing a job twice.', K.done==='watermark'?'Uber 2021.':'Meta 2021.',null); return {held:true};
   },
   hints:[['stop the reshuffle from happening','Every deploy adds and removes workers, so it reshuffles. A gentler reshuffle softens it, but some jobs still come back. That is built in.'],['have workers spot and skip repeats','Uber\'s answer. The cost is that spotting repeats has to keep working forever.'],['mark jobs done before working on them, to avoid repeats','That is marking done on hand-out. It turns the repeat into a lost job.']]},
  {t:'A2 · SLACK: THE SLOWDOWN LASTS THREE DAYS',group:'retention',
   brief:'You survived a slow afternoon. Now the workers stay slow for three days. Where does the backlog go?',
   attack:async function(){
    var spilled=(K.full==='relay')||(K.where!=='mem'&&K.full==='accept');
    if(!spilled){ LEVELS[1].group='full'; paintDeck(); await say('ATTACK 2','Three days of slow workers. '+(K.where==='mem'?'Memory fills again, and this time nobody is around to unstick it.':'The queue '+(K.full==='reject'?'refuses jobs for three days.':'slows its senders for three days.'))); await sleep(900); await card('bad','THREE DAYS OF THE SAME FAILURE','The afternoon\'s failure, for three days. Change what the queue does when full, then run the attack again.','Slack 2017.','full'); return; }
    await say('ATTACK 2','Three days of slow workers. The queue on disk grows and grows, and it only keeps jobs for a set time. A new decision appeared: how long the queue on disk keeps jobs. It starts at two days.');
    ROWS_ADDED.retention=true; if(!K.retention) K.retention='2d'; LEVELS[1].group='retention'; openGroup='retention'; paintDeck(); focusDeckSel('retention');
    await phase(12,function(s){ s.spill+=30; s.backlog=Math.min(60,s.backlog+1); s.drainNow=6; }); await dwell(900);
    await card('bad','THE OLDEST JOBS EXPIRED UNDELIVERED','The backlog lasted longer than the two days the queue keeps jobs. The queue held everything, until it didn\'t. Nothing locked up, and jobs still vanished.','Slack 2017: the backlog now piles up in Kafka, which keeps jobs for two days.','retention');
    await say('ATTACK 2','Decide how long to keep jobs, then run the attack again, and read the bill.');
   },
   rerun:async function(){
    var spilled=(K.full==='relay')||(K.where!=='mem'&&K.full==='accept');
    if(!spilled){ await sleep(700); await card('bad','STILL FAILING FOR THREE DAYS','When full, the queue doesn\'t overflow to anything on disk.','Slack 2017.','full'); return {held:false}; }
    if(!ROWS_ADDED.retention){ ROWS_ADDED.retention=true; if(!K.retention) K.retention='2d'; LEVELS[1].group='retention'; openGroup='retention'; paintDeck(); focusDeckSel('retention'); await phase(10,function(s){s.spill+=30;}); await card('bad','NOW THE BACKLOG HAS A TIME LIMIT','Your queue overflows to disk now, and disk keeps jobs for a set time. It starts at two days. Decide, then run it again.','Slack 2017.','retention'); return {held:false}; }
    await phase(10,function(s){ s.spill+=30; s.drainNow=6; });
    if(K.retention==='2d'){ await card('bad','BROKE AGAIN: JOBS EXPIRED','Three days of backlog, and jobs are kept for two.','Slack 2017.','retention'); SIM.spill=0; return {held:false}; }
    if(K.retention==='unbounded'){ await card('warn','HELD, BY NEVER DELETING ANYTHING','Nothing expired. Now the disk is what fills up, and the bill turns red on storage.','Slack 2017 kept two days.','retention'); SIM.spill=0; dayDamage=dayTokens(K); renderBill(dayDamage.bill); return {held:true}; }
    await card('good','HELD: A WEEK OF HEADROOM','Three days of backlog, and jobs are kept for a week. Storage is now sized for the bad week, and someone still chooses the drain rate. Both are on the bill.','Slack 2017.',null); SIM.spill=0; dayDamage=dayTokens(K); renderBill(dayDamage.bill); return {held:true};
   },
   hints:[['add more workers','Then it isn\'t a three-day slowdown. The attack is what happens when you can\'t.'],['keep jobs long enough to cover the bad week','Slack\'s approach. Two days was their number. The point is that the number is a decision.'],['keep everything forever','It holds, and the disk becomes what fills up. Try it.']]},
  {t:'A3 · DOORDASH: THE QUEUE\'S FLOW CONTROL KICKS IN',group:'full',
   brief:'This attack changes one of your decisions. Like RabbitMQ, your queue now slows its senders down when it feels pressure.',
   attack:async function(){
    await say('ATTACK 3','Your queue has <b>Flow Control built in</b>, like RabbitMQ, and it kicks in under load. Your WHEN FULL decision just changed under you.');
    K.full='throttle'; paintDeck(); drawStage(); await sleep(700);
    await say('ATTACK 3','A peak arrives. The queue slows the app servers, and they feel it as delay. A timeout on the app servers kills their slowed processes over and over, and the restarts flood the queue. It stays this way until you change it back.');
    ['A','B','C'].forEach(function(x){SIM['wait'+x]=50;}); await phase(10,function(s){s.drainNow=4;}); await dwell(900);
    await card('bad','THE SLOWDOWN FED ITSELF','The slowing reached the senders as delay nobody could explain, and the timeout-and-restart loop made it worse.','DoorDash 2020.','full');
    ['A','B','C'].forEach(function(x){SIM['wait'+x]=0;}); paintSim();
   },
   rerun:async function(){
    if(K.full==='throttle'){ ['A','B','C'].forEach(function(x){SIM['wait'+x]=50;}); await phase(8,function(s){s.drainNow=4;}); ['A','B','C'].forEach(function(x){SIM['wait'+x]=0;}); paintSim(); await card('bad','BROKE AGAIN: SENDERS STILL SLOWED','A queue that handles overload by slowing its senders has passed the pressure on, where nobody can see it.','DoorDash 2020.','full'); return {held:false}; }
    await phase(8,function(s){s.drainNow=K.full==='relay'?30:14; if(K.full==='relay') s.spill+=2;}); SIM.spill=0;
    if(K.full==='reject'){ await card('bad','BROKE: NOW SENDERS GET ERRORS INSTEAD','Refusing is at least visible, but the jobs are still gone.','Slack 2017.','full'); return {held:false}; }
    await card('good','HELD: THE PRESSURE HAS SOMEWHERE TO GO','The queue '+(K.full==='relay'?'overflows to disk and feeds the workers at their pace':'accepts and delays')+' instead of making its senders guess. Decide who feels a full queue before it fills.','DoorDash 2020 shows what goes wrong. Slack 2017 and Meta 2021 show the fixes.',null); return {held:true};
   },
   hints:[['tune Flow Control\'s limits','The senders still can\'t tell being slowed down from a slow network. The mechanism is the problem.'],['make the queue accept, or overflow to disk','That is the WHEN FULL decision. The attack changed it.'],['raise the timeout','It slows the restart loop, but not the slowing that starts it.']]},
  {t:'A4 · META: THE BACKLOG REACHES HUNDREDS OF BILLIONS',group:'scans',
   brief:'You accepted delay as part of the deal. Now the backlog is enormous. Does the queue itself get slower?',
   attack:async function(){
    if(K.where==='rows'){ await say('ATTACK 4','The backlog is a hundred billion rows. The database keeps <b>old versions of rows in a list that grows with the backlog</b>, and the background lookups that mark jobs ready and expire time limits have to walk it. A new decision appeared: how the lookups run.'); ROWS_ADDED.scans=true; if(!K.scans) K.scans='full'; LEVELS[3].group='scans'; openGroup='scans'; paintDeck(); focusDeckSel('scans'); await phase(12,function(s){s.backlog+=50; s.drainNow=Math.max(2,30-s.backlog/12);}); await dwell(900); await card('bad','THE DRAIN SLOWED AS THE BACKLOG GREW','The queue\'s own storage got slower the fuller it was. Reads slowed as the list of old versions grew.','Meta 2021.','scans'); await say('ATTACK 4','Decide how the lookups run, then run the attack again.'); }
    else if(K.where==='log'){ LEVELS[3].group='where'; paintDeck(); await say('ATTACK 4','The backlog is enormous. A log doesn\'t slow down as it grows, it just fills. How long it keeps jobs decides the rest (attack 2).'); await phase(8,function(s){s.backlog+=50;}); await say('ATTACK 4','Nothing to fix here that attack 2 didn\'t. Run it again to confirm.'); }
    else { LEVELS[3].group='where'; paintDeck(); await say('ATTACK 4','The backlog is enormous, and yours lives in memory. It locked up long before hundreds of billions.'); await phase(8,function(s){s.backlog=s.cap;s.seized=true;}); SIM.seized=false; await card('bad','MEMORY CAN\'T HOLD A BACKLOG THIS DEEP','Delay, not loss, needs storage that can hold the delay.','Slack 2017, Meta 2021.','where'); }
   },
   rerun:async function(){
    if(K.where==='mem'){ await phase(6,function(s){s.backlog=s.cap;}); await card('bad','STILL LOCKING UP','A queue in memory can\'t hold a backlog this deep.','Slack 2017.','where'); SIM.backlog=8; return {held:false}; }
    if(K.where==='log'){ await phase(6,function(s){s.backlog+=20;}); await card('good','HELD: A LOG FILLS BUT DOESN\'T SLOW','A deeper backlog costs disk, not speed. How long you keep jobs is the decision that matters, and you made it.','Slack 2017.',null); SIM.backlog=8; return {held:true}; }
    if(!ROWS_ADDED.scans){ ROWS_ADDED.scans=true; if(!K.scans) K.scans='full'; LEVELS[3].group='scans'; openGroup='scans'; paintDeck(); focusDeckSel('scans'); }
    await phase(8,function(s){ s.backlog+=50; s.drainNow=K.scans==='checkpoint'?30:Math.max(2,30-s.backlog/12); });
    if(K.scans!=='checkpoint'){ await card('bad','BROKE AGAIN: LOOKUPS WALK THE WHOLE HISTORY','Reads slow down as the backlog grows.','Meta 2021.','scans'); SIM.backlog=8; return {held:false}; }
    await card('good','HELD: LOOKUPS START FROM A CHECKPOINT','A saved marker of the last job already handled sets where each lookup starts, so it reads only new work. The list it walks stays short, and the reads stay fast. Keeping that up is on the bill.','Meta 2021.',null); dayDamage=dayTokens(K); renderBill(dayDamage.bill); SIM.backlog=8; return {held:true};
   },
   hints:[['add more database servers','That spreads the backlog, but every lookup still walks the list of old versions. The new decision is the fix.'],['start every lookup from a checkpoint','Meta\'s answer. The new decision has this option.'],['clean out old rows more often','Cleaning out old rows is itself a lookup by time, so it walks the same list.']]},
  {t:'A5 · SEGMENT: THE PARTNER IS DOWN FOR SIX HOURS',group:'archive',
   brief:'You chose how retries behave. Now the outage lasts longer than any cutoff you might have set.',
   attack:async function(){
    SIM.partner='DOWN'; paintSim();
    if(K.retry==='forever'){ LEVELS[4].group='retry'; paintDeck(); await say('ATTACK 5','Six hours down. Six hours of retries <b>at full speed</b> against a partner that isn\'t responding, and then a storm when it is.'); await phase(10,function(s){s.rps=90000;}); SIM.rps=0; await dwell(900); await card('bad','SIX HOURS OF KNOCKING, THEN A STORM','The queue that soaked up the outage became a second problem for the partner, twice.','Segment 2018.','retry'); }
    else if(K.retry==='backoff'){ LEVELS[4].group='retry'; paintDeck(); await say('ATTACK 5','Six hours down. Retries wait longer and longer, and the pile of retries grows with no limit. When the partner returns, everything is delivered, late.'); await phase(10,function(s){s.backlog+=8;}); await say('ATTACK 5','It holds. The cost is delivery six hours late, and a retry pile with no ceiling. Run it again to confirm.'); }
    else { await say('ATTACK 5','Six hours down. Your <b>four-hour cutoff</b> passed at hour four. Everything older is archived, and the partner comes back at hour six. A new decision appeared: what happens to archived jobs.'); ROWS_ADDED.archive=true; if(!K.archive) K.archive='drop'; LEVELS[4].group='archive'; openGroup='archive'; paintDeck(); focusDeckSel('archive'); await phase(10,function(s){s.backlog=Math.max(8,s.backlog-6);}); await dwell(900); await card('bad','TWO HOURS OF JOBS ARCHIVED, AND GONE','The cutoff did its job, and the jobs it cut are nobody\'s problem. The customers whose events those were would disagree.','Segment 2018 archives to S3. What happens next is the decision.','archive'); }
    SIM.partner='up'; paintSim();
   },
   rerun:async function(){
    SIM.partner='DOWN'; paintSim(); await phase(6,function(s){});
    SIM.partner='up'; paintSim();
    if(K.retry==='forever'){ await phase(6,function(s){s.rps=90000;}); SIM.rps=0; paintSim(); await card('bad','STILL STORMING','Retries at full speed, forever.','Segment 2018.','retry'); return {held:false}; }
    if(K.retry==='backoff'){ await phase(6,function(s){s.rps=16000;s.backlog=Math.max(8,s.backlog-6);}); SIM.rps=0; paintSim(); await card('warn','HELD: DELIVERED SIX HOURS LATE, NO CEILING ON RETRIES','Waiting longer each time with no cutoff never gives up. That is the promise and the cost.','Segment 2018.',null); return {held:true}; }
    if(!ROWS_ADDED.archive){ ROWS_ADDED.archive=true; if(!K.archive) K.archive='drop'; LEVELS[4].group='archive'; openGroup='archive'; paintDeck(); focusDeckSel('archive'); await card('bad','THE CUTOFF PASSED: WHAT HAPPENS TO THE ARCHIVE?','A new decision appeared. Decide, then run it again.','Segment 2018.','archive'); return {held:false}; }
    if(K.archive!=='replay'){ await card('bad','BROKE AGAIN: ARCHIVED JOBS STAYED GONE','Two hours of events in cold storage that nobody replays.','Segment 2018.','archive'); return {held:false}; }
    await phase(6,function(s){s.rps=16000;}); SIM.rps=0; paintSim();
    await card('good','HELD: ARCHIVED, THEN REPLAYED BY HAND','The cutoff limited the retry storm, the archive kept the jobs, and a person replayed them. Put off, not lost, and a standing job on the bill.','Segment 2018 archives to S3. Uber 2021 replays its dead-letter queue by hand, the closest thing to this.',null); dayDamage=dayTokens(K); renderBill(dayDamage.bill); return {held:true};
   },
   hints:[['keep retrying, it will come back','Six hours of full-speed knocking, then a storm. You watched it.'],['wait longer each time and never give up','It holds, with no ceiling on the retry pile.'],['cut off, archive, and keep replay tools','Segment archives to S3. The replay is the missing half.']]}
 ];


 async function escEnter(i){ escMode=i; curLvl=i+1; paintDeck(); setCue('group'); var lvlEl=$$('#lvls .lvl')[i]; lvlEl.querySelector('.fixrow').style.display=''; await say('YOUR MOVE','Fix it with your decisions (the group that matters is glowing), then <b>run the attack again</b>. Hints are under the attack.'); }
 function escAbandon(){ if(escMode<0) return; var lvlEl=$$('#lvls .lvl')[escMode]; if(lvlEl) lvlEl.querySelector('.fixrow').style.display='none'; escMode=-1; curLvl=0; setCue(''); paintDeck(); }
 async function escExit(i,held){ if(!held) return; escMode=-1; curLvl=0; lvlDone[i]=true; var lvlEl=$$('#lvls .lvl')[i]; lvlEl.querySelector('.done').style.display='inline'; lvlEl.querySelector('.fixrow').style.display='none'; setCue(''); paintDeck(); if(i+1<LEVELS.length){$$('#lvls .lvl')[i+1].classList.remove('locked2'); await say('ATTACK '+(i+1)+' SURVIVED','Your design held. The next attack is unlocked.');} if(lvlDone.every(Boolean)) buildDebrief(); }
 function buildLevels(){
  var host=$('#lvls'); host.innerHTML='';
  LEVELS.forEach(function(L,i){ var d=document.createElement('div'); d.className='lvl'+(i>0?' locked2':''); d.innerHTML='<div class="lt">'+L.t+' <span class="done">\u2713 HELD</span></div><div class="lq">'+L.brief+' <span class="watch" data-lvl="'+i+'">\u25B6 watch the attack</span></div><div class="fixrow" style="display:none;"><button class="opt rerunbtn" data-lvl="'+i+'">RE-RUN THE ATTACK \u25B6</button></div><details class="hints"><summary>HINTS</summary>'+L.hints.map(function(hh,j){return '<button class="opt hintbtn" data-lvl="'+i+'" data-h="'+j+'">'+hh[0]+'</button>';}).join('')+'<div class="verdict"></div></details>'; host.appendChild(d); });
  $$('#lvls .watch').forEach(function(w){ w.addEventListener('click',async function(){ var i=+w.dataset.lvl; if(running) return; if($$('#lvls .lvl')[i].classList.contains('locked2')||lvlDone[i]) return; running=true; lock(true); curLvl=i+1; drawStage(); await LEVELS[i].attack(); await escEnter(i); lock(false); running=false; });});
  $$('#lvls .rerunbtn').forEach(function(b){ b.addEventListener('click',async function(){ var i=+b.dataset.lvl; if(running||escMode!==i) return; running=true; lock(true); curLvl=i+1; drawStage(); var res=await LEVELS[i].rerun(); await escExit(i,!!res.held); lock(false); running=false; });});
  $$('#lvls .hintbtn').forEach(function(b){ b.addEventListener('click',function(){ var i=+b.dataset.lvl,j=+b.dataset.h; var v=$$('#lvls .lvl')[i].querySelector('.verdict'); v.className='verdict on'; v.textContent=LEVELS[i].hints[j][1]; });});
 }
 function drow(l,c,w){ return '<b>'+l+':</b> '+c+'<br><span style="color:#6B7280;">'+w+'</span><br><br>'; }
 function buildDebrief(){
  var d=$('#debrief'); d.className='debrief on'; var bill=dayTokens(K).bill;
  var h='<span class="dt">HELD UNDER ATTACK: THE DEBRIEF</span><br><br>Your final design, decision by decision:<br><br>';
  h+=drow('WHERE',{mem:'in memory',log:'a log on disk',rows:'rows in a database'}[K.where], {mem:'None of the five kept the backlog in memory. Slack 2017 explains why.',log:'Uber 2021 and Slack 2017 (in front), and DoorDash 2020 after the move. A deeper backlog costs disk, and how long you keep jobs is the decision.',rows:'Meta 2021 and Segment 2018. Reads stay fast with checkpoints, or by replacing databases every 30 minutes, and there is a fleet of databases to run.'}[K.where]);
  h+=drow('WHEN FULL',{accept:'accept everything and delay',reject:'refuse new jobs',throttle:'slow the senders',relay:'overflow to disk, and a relay feeds the workers at their pace'}[K.full], {accept:'Meta 2021: delay, not loss. A backlog is the system working.',reject:'Slack\'s old system did this by accident. None of the five chose it.',throttle:'DoorDash 2020 is the warning: the pressure reaches senders as delay they can\'t explain.',relay:'Slack 2017. Two systems, and someone owns the drain-rate dial.'}[K.full]);
  h+=drow('STUCK JOB',{block:'blocks its line',requeue:'goes to the back',ackaround:'set aside in a dead-letter queue',localq:'a small local queue'}[K.stuck], {block:'The wall itself. Uber 2021 and Segment 2018 both describe it.',requeue:'Slack 2017 retries a failing job a set number of times, then sets it aside. Without that limit, it circles forever.',ackaround:'Uber 2021: confirm jobs one by one, plus a dead-letter queue. A person empties it.',localq:'DoorDash 2020: fetching separate from running, and a small loss window.'}[K.stuck]);
  h+=drow('ORDER',{fifo:'first in, first out',priority:'most important first',tenant:'by a query, per customer'}[K.order], {fifo:'Segment 2018 lived through the shared line. Uber 2021 wanted no order at all.',priority:'Meta 2021. Machinery that runs all the time across databases, and it doesn\'t separate customers.',tenant:'Segment 2018: order as a query.'}[K.order]);
  h+=drow('DONE MEANS',{fetch:'handed out',lease:'confirmed, with a time limit',watermark:'confirmed one by one, saved as a marker'}[K.done], {fetch:'Uber 2021 rejects it: it turns a blockage into lost data.',lease:'Meta 2021. Coping with repeats is a cost every worker pays.',watermark:'Uber 2021. Progress in two places, repeats after a reshuffle, and skipping repeats forever.'}[K.done]);
  h+=drow('RETRIES',{forever:'full speed, forever',backoff:'wait longer each time, never give up',cutoff:'wait longer each time, then a cutoff'}[K.retry], {forever:'Segment 2018\'s open problem, made permanent.',backoff:'Segment 2018\'s backoff, without its four-hour cutoff. No ceiling on the retry pile.',cutoff:'Segment 2018: four hours, then cold storage (S3).'}[K.retry]);
  if(K.dedupe) h+=drow('DUPLICATES',K.dedupe==='yes'?'workers skip repeats':'workers do whatever arrives',K.dedupe==='yes'?'Uber 2021. The habit that has to hold forever.':'None of the five, and attack 1 showed why.');
  if(K.retention) h+=drow('KEEP FOR',{'2d':'two days','7d':'a week',unbounded:'no limit'}[K.retention],'Slack 2017 kept two days. The point is that it is a decision, sized for the bad week.');
  if(K.scans) h+=drow('LOOKUPS',K.scans==='checkpoint'?'start from a checkpoint':'read everything waiting',K.scans==='checkpoint'?'Meta 2021. Checkpoints keep the lookups fast, inside MySQL.':'Meta 2021, before the fix.');
  if(K.archive) h+=drow('PAST THE CUTOFF',K.archive==='replay'?'archived, with replay tools':'archived and forgotten',K.archive==='replay'?'Segment 2018 archives. Uber 2021 replays its dead-letter queue by hand.':'None of the five.');
  h+='<b>THE BILL, IN FULL:</b><br>'+bill.map(function(b){return '• '+b.c+' <span style="color:#6B7280;">('+b.s+')</span>';}).join('<br>')+'<br><br>Same queue, different cost. <b>That trade-off is the interview answer.</b>';
  d.innerHTML=h;
 }

 /* ---------- restore (page 1, B2-1/F6) ----------
    The one host->mission call that mutates engine state: rebuild a saved
    design without animating, including the rows attacks added. */
 function restore(decisions,survived,held){
  decisions=decisions||{};
  ['where','full','stuck','order','done','retry','dedupe','retention','scans','archive'].forEach(function(k){ if(decisions[k]!=null) K[k]=decisions[k]; });
  ROWS_ADDED={ dedupe:decisions.dedupe!=null, retention:decisions.retention!=null, scans:decisions.scans!=null, archive:decisions.archive!=null };
  paintDeck(); drawStage();
  if(!survived) return;
  won=true; runsDone=1;
  dayDamage=dayTokens(K);
  meters(dayDamage);
  renderBill(dayDamage.win?dayDamage.bill:null);
  buildLevels();
  $('#escwrap').style.display='';
  held=held||[];
  var lvls=$$('#lvls .lvl');
  for(var i=0;i<LEVELS.length;i++){
   if(held[i]){
    lvlDone[i]=true;
    if(lvls[i]){ lvls[i].querySelector('.done').style.display='inline'; lvls[i].classList.remove('locked2'); }
    if(lvls[i+1]) lvls[i+1].classList.remove('locked2');
   }
  }
  if(lvlDone.every(Boolean)) buildDebrief();
  $('#runbtn').innerHTML='RUN AGAIN \u25B6';
  setCue('');
  sayNow('RESTORED','Your design from last time. Run it again, or go straight to the attacks.');
 }

 $('#runbtn').addEventListener('click',runAll);
 $('#stepbtn').addEventListener('click',stepOne);
 $('#resetbtn').addEventListener('click',function(){ if(running) return; K=Object.assign({},NAIVE); ROWS_ADDED={dedupe:false,retention:false,scans:false,archive:false}; won=false; lvlDone=[false,false,false,false,false]; evIdx=0; escMode=-1; curLvl=0; runsDone=0; openGroup='where'; var rb=$('#runbtn'); rb.innerHTML='RUN THE DAY \u25B6'; setCue('run'); $('#escwrap').style.display='none'; $('#debrief').className='debrief'; $('#bill').style.display='none'; freshDay(); paintDeck(); sayNow('READY','Starting decisions restored. Run the day.'); });
 chips(); drawStage(); paintDeck(); setCue('run');
 sayNow('READY','Your decisions start out naive on purpose: a queue in memory that accepts everything, a stuck job that blocks its line, one shared line, done when handed out, and retries forever. <b>Run the day as it is first, and see what breaks.</b>');
 return { restore: restore };
}

// ---- the host bridge (page 1's, with this wall's keys) ----
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
  ['where','full','stuck','order','done','retry','dedupe','retention','scans','archive'].forEach(function(k){
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
  [['kg-dedupe',0,'ADDED BY ATTACK 1'],['kg-retention',1,'ADDED BY ATTACK 2'],['kg-scans',3,'ADDED BY ATTACK 4'],['kg-archive',4,'ADDED BY ATTACK 5']].forEach(function(t){
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
  var d = parseInt($('#m-lost').textContent, 10), l = parseInt($('#m-stall').textContent, 10), t = parseInt($('#m-out').textContent, 10);
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
  /* slot jumps ("all N cards", "THE BILL"): the target is inside the frame.
     Desktop: the frame is a scrollport, so it scrolls itself (window.scrollTo,
     never scrollIntoView). Phone: the frame is content-height and can't
     scroll, so the host scrolls the page to the target's offset in the frame.
     Both are sent; the host ignores the frame offset when the frame scrolls. */
  var sj = t.closest('.sjump');
  if (sj){
   e.preventDefault();
   var tgt = document.getElementById(sj.getAttribute('data-target'));
   if (tgt){
    var tr = tgt.getBoundingClientRect(), top = tr.top + window.pageYOffset;
    window.scrollTo({ top: Math.max(0, top - 12), behavior: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth' });
    post({ type: 'anchor', frame: { top: top, height: tr.height } });
   }
   return;
  }
  var kl = t.closest('.kl');
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

 /* ---- init from the host ---- */
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

export default function ProblemQueueBacklogMission() {
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
