import { useEffect } from 'react'

// Problem-level artifact - "The ambiguity window" (try-it), for
// /problems/ambiguous-timeouts. Ported from problem-page-v7.3.html (the
// approved reference build): the markup, styles, and Script 1 (the try-it
// state machine: START / MID / OUTCOMES tables, 15 outcomes) are the
// prototype's, VERBATIM. This React shell renders the markup once and boots
// the vanilla engine in an effect; it touches none of the frozen code.
//
// Pure stage machine (taste doc: sequences take zero intervals); the
// OUTCOMES table is the step function, assertable headless.
//
// Sanctioned edit (Batch 2, B2-9.3/F22): the footer backlink shows only when
// standalone (id="tryit-backlink", default hidden; the embed gate reveals it)
// and is same-tab (target dropped). Embedded it pointed at the current page
// and target=_blank was a sandbox no-op. Reference untouched.
//
// Sanctioned edit (Batch 2, B2-13/F12): the wire keeps its scroll wrapper on
// phone with an on-load "⟷ scroll" hint. A vertical (GH/GV) relayout would be
// the legible fix but is a geometry rewrite of this static SVG whose cut zones
// the frozen engine binds by id -- deferred to the Batch 1 design spec.
//
// Host protocol (v1, see src/pages/ProblemDetail.tsx): this artifact posts
// {v:1, wall, type:'size', h} so the host can size the frame to its
// content. Embedded (window.parent !== window) it keeps the context block
// folded, as the reference page does; opened standalone it expands the
// block by default (the standalone-visitor contract).
//
// Fonts: the fallback mono stack, like every shipped artifact -- the
// reference build loads JetBrains Mono from Google Fonts, which a sandboxed
// bundle must not fetch at runtime (visual deviation, recorded in the PR).

const WALL = 'ambiguous-failure-under-retry'

const CSS = `
:root {
 --art-bg: #08090D; --art-surface: #0F1118; --art-surface-2: #161922;
 --art-border: #1F2333; --art-text: #C8CDD8; --art-muted: #98A1B0; /* legibility: #6B7280 is 3.9:1 on --art-surface; this is 7.2:1 for the 9-10px labels */
 --art-border-interactive: #3a4158; --art-text-bright: #EDEFF3;
 --art-red: #ef4444; --art-amber: #eab308; --art-green: #22c55e;
 --accent-problem: #D946EF; --accent-problem-hover: #E879F9;
 --mono: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace;
}
:where(#tryit-root) * { margin: 0; padding: 0; box-sizing: border-box; }
#tryit-root b { color: var(--art-text-bright); font-weight: 600; }
.artifact { background: var(--art-bg); color: var(--art-text); border: 1px solid var(--art-border); border-radius: 12px; padding: 20px; margin: 0; font-family: var(--mono); font-size: 12px; line-height: 1.5; width: 100%; position: relative; }
.art-eyebrow { color: var(--art-muted); font-size: 10px; letter-spacing: 2px; }
.art-title { color: var(--art-text-bright); font-size: 16px; font-weight: 700; margin: 4px 0 2px; }
.art-sub { color: var(--art-muted); font-size: 11px; margin: 0; }
.art-ctx { background: var(--art-surface); border: 1px solid var(--art-border); border-radius: 8px; padding: 12px 14px; margin-top: 12px; }
.art-ctx-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 10px; color: var(--art-muted); letter-spacing: 1.2px; }
.art-ctx-line { font-size: 12px; line-height: 1.6; margin-top: 8px; color: var(--art-text); }
.art-ctx-line .lbl { color: var(--art-muted); font-size: 10px; letter-spacing: 1.2px; }
.art-ghost { background: none; border: none; color: var(--art-muted); cursor: pointer; font-family: inherit; font-size: 10px; padding: 0; }
.art-cols { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.art-panel { background: var(--art-surface); border: 1px solid var(--art-border); border-radius: 8px; padding: 12px; }
.art-controls { flex: 1 1 250px; min-width: 250px; }
.art-right { flex: 2 1 420px; min-width: 300px; }
.art-label { color: var(--art-muted); font-size: 10px; letter-spacing: 1.2px; }
.art-label.gap { display: block; margin-top: 12px; }
.abtn { display: block; width: 100%; text-align: left; padding: 7px 9px; margin-top: 6px; border-radius: 6px; cursor: pointer; border: 1px solid var(--art-border-interactive); color: var(--art-text); background: var(--art-surface); font-family: inherit; font-size: 11px; }
.abtn small { display: block; font-size: 10px; line-height: 1.5; color: var(--art-muted); margin-top: 1px; font-weight: 400; }
.abtn:hover:not(:disabled) { border-color: var(--art-text); }
.abtn:disabled { opacity: 0.5; cursor: not-allowed; }
.abtn.cut { border-color: #ef4444; color: #ef4444; }
.abtn.cut.sel { background: rgba(239,68,68,0.16); font-weight: 700; }
.abtn.shelf { border-color: #eab308; color: #eab308; }
.abtn.shelf.sel { background: rgba(234,179,8,0.16); font-weight: 700; }
.abtn.move.sel { border-color: var(--art-text); color: var(--art-text-bright); background: rgba(200,205,216,0.10); font-weight: 700; }
.averdict { padding: 10px 12px; border-radius: 8px; border: 1px solid var(--art-border); margin-bottom: 12px; opacity: 0; transform: translateY(5px); transition: opacity 0.4s ease, transform 0.4s ease; }
.averdict.on { opacity: 1; transform: none; }
.averdict .code { font-weight: 700; }
.averdict .vbody { margin-top: 5px; font-size: 11.5px; line-height: 1.6; color: var(--art-text); }
.averdict.v-red { border-color: #ef4444; background: rgba(239,68,68,0.08); }
.averdict.v-red .code { color: #ef4444; }
.averdict.v-amber { border-color: #eab308; background: rgba(234,179,8,0.08); }
.averdict.v-amber .code { color: #eab308; }
.averdict.v-green { border-color: #22c55e; background: rgba(34,197,94,0.08); }
.averdict.v-green .code { color: #22c55e; }
.art-wells { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.well { background: var(--art-surface); border: 1px solid var(--art-border); border-radius: 6px; padding: 8px 10px; flex: 1; min-width: 150px; }
.well.watched { border-color: #eab308; }
.well .rows { font-size: 11px; margin-top: 4px; line-height: 1.7; }
.art-meters { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.art-meter { flex: 1; min-width: 120px; }
.art-meter .val { font-size: 15px; font-weight: 700; color: var(--art-text); }
.art-meter .val.bad { color: #ef4444; }
.art-meter .val.good { color: #22c55e; }
.art-meter .val.unk { color: #eab308; }
.art-foot { color: var(--art-muted); font-size: 10px; margin-top: 12px; border-top: 1px solid var(--art-border); padding-top: 8px; line-height: 1.7; }
.art-foot a { color: var(--art-text); text-decoration: underline; }
.stagewrap { overflow-x: auto; margin-top: 12px; position: relative; }
svg.stage { width: 100%; min-width: 480px; height: auto; display: block; }
/* B2-13 (F12): the 640-wide wire keeps its scroll wrapper on phone (scaling
   to ~324px drops the 8.5px labels to ~4.3px - illegible; a vertical relayout,
   like the mission's GH/GV, is a geometry rewrite of this static wire whose
   cut zones the frozen engine binds by id, so it is deferred to the Batch 1
   design spec). The hint reads on load, centered, not on hover. */
@media (max-width: 700px) {
 .stagewrap::after { content: "\\27f7 scroll"; position: absolute; left: 50%; bottom: 4px; transform: translateX(-50%); background: var(--art-surface); border: 1px solid var(--art-border-interactive); border-radius: 999px; padding: 1px 8px; color: var(--art-muted); font-family: var(--mono); font-size: 10px; pointer-events: none; }
}
svg.stage text { font-family: var(--mono); }
.s-node { fill: var(--art-surface); stroke: var(--art-border); stroke-width: 1.3; }
.s-nlabel { font-size: 11px; fill: var(--art-text); text-anchor: middle; letter-spacing: 0.03em; }
.s-nsub { font-size: 8.5px; fill: var(--art-muted); text-anchor: middle; }
.s-seg { stroke: var(--art-border); stroke-width: 2; }
.s-cutzone { cursor: pointer; }
.s-cutzone circle { fill: var(--art-surface); stroke: #ef4444; stroke-width: 1.2; }
.s-cutzone.sel circle { fill: rgba(239,68,68,0.20); stroke-width: 2; }
.s-cutzone text { font-size: 10px; fill: #ef4444; text-anchor: middle; }
@media (prefers-reduced-motion: reduce) {
 .averdict { transition: none !important; transform: none !important; }
}
`

const MARKUP = `
<div class="artifact" id="artifact">
 <div class="art-eyebrow">PROBLEM CLASS · AMBIGUOUS FAILURE UNDER RETRY - INTERACTIVE</div>
 <div class="art-title">The ambiguity window <span style="font-size:9px;letter-spacing:1.5px;border:1px solid #6B7280;color:#6B7280;border-radius:5px;padding:2px 7px;vertical-align:2px;font-weight:400;">TRY IT</span></div>
 <p class="art-sub">One $100 charge, three places to cut it, and a ledger the client can't see. The only thing in doubt is what the retry finds.</p>

 <div class="art-ctx" id="artctx" style="display: none;">
  <div class="art-ctx-head"><span>CONTEXT - IF YOU ARRIVED HERE WITHOUT THE PAGE</span><button class="art-ghost" id="ctxhide">HIDE ✕</button></div>
  <div class="art-ctx-line"><span class="lbl">THE PROBLEM · </span>A request that times out or fails mid-flight leaves the caller unable to tell whether it already took effect - so a retry risks repeating an operation that in fact succeeded.</div>
  <div class="art-ctx-line"><span class="lbl">THE MOVE · </span>Five companies (Stripe, AWS, Airbnb, Shopify, Segment) answer with the same tool: the caller names the operation with an idempotency key and the system remembers the name. This artifact lets you make the three decisions that tool forces on you - where the call dies, what the client does, and where the key's memory lives.</div>
  <div class="art-ctx-line"><span class="lbl">TRY · </span>Cut the response after success and retry blindly - the classic double charge. Then turn the key on but keep its memory on a lagging copy of the database (a replica): the double charge comes back with the key on. The ledger and key store on the right show the truth the client never sees.</div>
 </div>
 <button class="art-ghost" id="ctxshow" style="margin-top: 10px;">SHOW CONTEXT ▾</button>

 <div class="stagewrap">
 <svg class="stage" viewBox="0 0 640 138" role="img" aria-label="Interactive: a client sends POST /charge $100 to a server. Choose one of three cut points: request lost, server dies mid-work, or response lost.">
  <rect class="s-node" x="8" y="46" width="104" height="34" rx="7"/>
  <text class="s-nlabel" x="60" y="67">CLIENT</text>
  <rect class="s-node" x="508" y="46" width="124" height="34" rx="7"/>
  <text class="s-nlabel" x="570" y="61">SERVER</text>
  <text class="s-nsub" x="570" y="74">charges the card</text>
  <line class="s-seg" x1="120" y1="56" x2="500" y2="56"/>
  <line class="s-seg" x1="500" y1="72" x2="128" y2="72"/>
  <text class="s-nsub" x="310" y="46">POST /charge $100 →</text>
  <text class="s-nsub" x="310" y="88">← response</text>
  <g class="s-cutzone" aria-hidden="true" id="cut1" transform="translate(230, 24)"><circle r="11"/><text y="4">1</text></g>
  <g class="s-cutzone" aria-hidden="true" id="cut2" transform="translate(570, 108)"><circle r="11"/><text y="4">2</text></g>
  <g class="s-cutzone" aria-hidden="true" id="cut3" transform="translate(360, 108)"><circle r="11"/><text y="4">3</text></g>
  <text id="cutlab1" class="s-nsub" x="212" y="28" style="text-anchor: end; display: none">request lost</text>
  <text id="cutlab2" class="s-nsub" x="552" y="112" style="text-anchor: end; display: none">dies mid-work</text>
  <text id="cutlab3" class="s-nsub" x="342" y="112" style="text-anchor: end; display: none">response lost</text>
 </svg>
 </div>

 <div class="art-cols">
  <div class="art-panel art-controls">
  <span class="art-label">THE CUT - WHERE THE CALL DIES</span>
  <button class="abtn cut" data-cut="1">✂ request never arrives<small>the wire drops it before the server ever sees it</small></button>
  <button class="abtn cut" data-cut="2">✂ server dies mid-work<small>crashes somewhere between charged and not</small></button>
  <button class="abtn cut" data-cut="3">✂ response lost after success<small>the charge landed; only the reply vanished</small></button>
  <span class="art-label gap">THE CLIENT'S MOVE - ALL IT SAW WAS A TIMEOUT</span>
  <button class="abtn move" data-act="retry" disabled>RETRY BLINDLY<small>send the charge again; the server can't recognize it</small></button>
  <button class="abtn move" data-act="giveup" disabled>GIVE UP<small>assume it failed and never retry</small></button>
  <button class="abtn move" data-act="key" disabled>RETRY WITH THE SAME KEY<small>send it again carrying the same operation name</small></button>
  <span class="art-label gap" id="shelflabel" style="display: none;">THE KEY’S MEMORY - WHERE "HAVE I SEEN THIS KEY?" LIVES</span>
  <button class="abtn shelf" data-shelf="acid" style="display: none;">COMMITTED WITH THE WORK<small>key and charge in one all-or-nothing transaction</small></button>
  <button class="abtn shelf" data-shelf="store" style="display: none;">SEPARATE STORE, AFTER THE WORK<small>charge first, then record the key</small></button>
  <button class="abtn shelf" data-shelf="replica" style="display: none;">READ FROM A LAGGING REPLICA<small>the record is on the main database; the check reads a copy that is seconds behind</small></button>
  <button class="abtn" id="areset" style="margin-top: 12px;">↺ RESET</button>
  </div>

  <div class="art-right">
  <div class="averdict on" id="averdict"><div class="code" id="vcode"></div><div class="vbody" id="vbody"></div></div>
  <div class="art-panel">
   <span class="art-label">THE TRUTH - WHAT THE CLIENT CANNOT SEE</span>
   <div class="art-wells">
   <div class="well"><span class="art-label">BANK LEDGER</span><div class="rows" id="bankrows"></div></div>
   <div class="well" id="memwell"><span class="art-label" id="memlabel">KEY STORE</span><div class="rows" id="memrows"></div></div>
   </div>
   <div class="art-meters">
   <div class="art-meter"><span class="art-label">CUSTOMER CHARGED</span><div class="val" id="mcharged">0×</div></div>
   <div class="art-meter"><span class="art-label">CLIENT BELIEVES</span><div class="val" id="mbelief">nothing yet</div></div>
   </div>
  </div>
  </div>
 </div>

 <div class="art-foot">
  The three failure points and their one safe case are Stripe's; the crash that separates the work from its record, and the all-or-nothing commit that forbids it, are AWS's; the replica-lag double charge is Airbnb's own scenario; the window that shrinks under load instead of failing is Segment's; the recovery-steps framing is Shopify's. The $100, the single-row ledger, and the timings are illustrative - the failure modes are the posts'.
  <a href="https://www.behindscale.com/problems/ambiguous-timeouts" id="tryit-backlink" style="display:none;">From the full problem page at behindscale.com →</a>
 </div>
</div>
`

// ---- the frozen engine (problem-page-v7.3.html, Script 1) ----------------
function bootEngine() {
 var cut = null, act = null, shelf = null, revealTimer = null;
 var $ = function (s) { return document.querySelector(s); };
 var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

 /* Verdict-only strings (assertable); wells/meters carry the visible truth. */
 var START = { v: 'amber', code: 'YOU ARE THE CLIENT - $100 TO CHARGE', body: 'Cut the call somewhere. The interesting failure is not a clean error - it is a vanished answer.', bank: [], mem: null, charged: '0×', chargedCls: '', belief: 'nothing sent yet', beliefCls: '' };

 var MID = {
 1: { v: 'amber', code: 'TIMEOUT - AND THE TRUTH IS: NOTHING HAPPENED', body: 'The wire dropped the request. The ledger on the right is empty - but the client cannot see that ledger. All it holds is a timeout. Choose the move.', bank: [], charged: '0×', chargedCls: '', belief: 'timeout - unknown', beliefCls: 'unk' },
 2: { v: 'amber', code: 'TIMEOUT - AND THE TRUTH IS: NOBODY KNOWS', body: 'The server died somewhere inside the work. Even the ledger holds a question mark. This is the hardest of the three cases - choose the move.', bank: ['attempt 1 · $100? · UNKNOWN'], charged: '0-1× ?', chargedCls: 'unk', belief: 'timeout - unknown', beliefCls: 'unk' },
 3: { v: 'amber', code: 'TIMEOUT - AND THE TRUTH IS: IT WORKED', body: 'The charge landed; only the answer vanished. The ledger says $100 - the client cannot see the ledger. Choose the move.', bank: ['attempt 1 · CHARGE $100'], charged: '1×', chargedCls: '', belief: 'timeout - unknown', beliefCls: 'unk' }
 };

 var NEEDSHELF = { v: 'amber', code: 'THE KEY NEEDS A MEMORY', body: 'The retry carries the same key. Whether that saves you now depends entirely on where the server keeps its memory of the key - pick the key’s memory.', charged: null };

 var OUTCOMES = {
 '1|retry':  { v: 'amber', code: 'CHARGED ONCE - BY LUCK', body: 'Nothing had happened, so the blind retry was safe this time. But you could not have known: cut 3 looks identical from the client seat, and there the same guess charges twice. Stripe: only the first of the three failure ways is harmless.', bank: ['retry · CHARGE $100'], mem: null, charged: '1×', chargedCls: 'good', belief: 'charged once · true', beliefCls: 'good' },
 '1|giveup':  { v: 'red', code: 'NO DOUBLE CHARGE - AND NO SALE', body: 'Nothing happened and nothing ever will; the booking silently evaporates. Giving up is also a guess. Both wrong guesses cost money - they just send the bill to different people.', bank: [], mem: null, charged: '0×', chargedCls: 'bad', belief: 'failed · true, sale lost', beliefCls: 'bad' },
 '1|key|acid': { v: 'green', code: 'CHARGED ONCE', body: 'The retry carried the key, found no recorded attempt, and ran fresh - the ambiguity cost nothing. Retrying from total ignorance is safe now; Airbnb calls this write repair.', bank: ['retry · CHARGE $100 · K-1'], mem: 'K-1 · DONE', charged: '1×', chargedCls: 'good', belief: 'charged once · true', beliefCls: 'good' },
 '1|key|store': { v: 'green', code: 'CHARGED ONCE', body: 'No prior state existed in any memory; the retry ran fresh and recorded its outcome. Cut 1 is the easy case - the memory’s location only starts to matter once some state exists. Try cuts 2 and 3.', bank: ['retry · CHARGE $100 · K-1'], mem: 'K-1 · DONE', charged: '1×', chargedCls: 'good', belief: 'charged once · true', beliefCls: 'good' },
 '1|key|replica': { v: 'green', code: 'CHARGED ONCE', body: 'Even a lagging replica agrees on "never seen" when nothing was ever written. The replica trap needs existing state to spring - try cut 3 on this shelf.', bank: ['retry · CHARGE $100 · K-1'], mem: 'K-1 · DONE (master)', rep: 'K-1 · arrives later', charged: '1×', chargedCls: 'good', belief: 'charged once · true', beliefCls: 'good' },
 '2|retry':  { v: 'red', code: 'UP TO $200 - AND UNKNOWABLE', body: 'The first attempt may have charged before dying; the retry charges again regardless. Retrying is the only recovery available and also the one action that can double the charge - that trap is this whole problem class.', bank: ['attempt 1 · $100? · UNKNOWN', 'retry · CHARGE $100'], mem: null, charged: '1-2× ?', chargedCls: 'bad', belief: 'charged once · truth unknown', beliefCls: 'unk' },
 '2|giveup':  { v: 'red', code: 'MAYBE CHARGED - A SUPPORT TICKET WILL TELL YOU', body: 'The state of the world is now a customer-service problem: the charge either happened or it did not, and nobody on either end knows. Shopify answer for the still-wrong case: reconciliation - verify the money afterward.', bank: ['attempt 1 · $100? · UNKNOWN'], mem: null, charged: '0-1× ?', chargedCls: 'unk', belief: 'failed · possibly false', beliefCls: 'bad' },
 '2|key|acid': { v: 'green', code: 'CHARGED ONCE - THE CRASH ROLLED BACK CLEAN', body: 'Key and work were one commit, so the crash erased both together. The retry found nothing, ran fresh, succeeded. This is AWS argument: the half-failures are not allowed to exist. Q3 has all five crash answers.', bank: ['attempt 1 · rolled back · $0', 'retry · CHARGE $100 · K-1'], mem: 'K-1 · DONE (written by retry)', charged: '1×', chargedCls: 'good', belief: 'charged once · true', beliefCls: 'good' },
 '2|key|store': { v: 'red', code: 'DOUBLE CHARGE - THE MEMORY MISSED THE CRASH', body: 'The work finished; the crash hit before the key was recorded. The memory and the work parted ways, so the retry found "never seen" and charged again. (The crash could as easily have landed before the charge - this memory gambles on where.) Stripe names this gap ("heavily dependent on implementation"); Airbnb closes it with three all-or-nothing phases. Q3.', bank: ['attempt 1 · CHARGE $100 · unrecorded', 'retry · CHARGE $100 · K-1'], mem: 'K-1 · DONE (retry only)', charged: '2×', chargedCls: 'bad', belief: 'charged once · FALSE', beliefCls: 'bad' },
 '2|key|replica': { v: 'red', code: 'DOUBLE CHARGE - TWO FAILURES STACKED', body: 'The crash split the work from its record, and even a record that survived would arrive seconds late from this replica. A guarantee sitting on a lagging copy is not a guarantee. Q2.', bank: ['attempt 1 · CHARGE $100 · unrecorded', 'retry · CHARGE $100 · K-1'], mem: 'K-1 · DONE (master, retry only)', rep: ' - K-1 not here yet - ', charged: '2×', chargedCls: 'bad', belief: 'charged once · FALSE', beliefCls: 'bad' },
 '3|retry':  { v: 'red', code: 'THE CLASSIC DOUBLE CHARGE', body: 'The work was done; only the answer was lost - and you did it again. This is 0.6% of ALL traffic at Segment, not an edge case. Every system on this page exists because of this ending.', bank: ['attempt 1 · CHARGE $100', 'retry · CHARGE $100'], mem: null, charged: '2×', chargedCls: 'bad', belief: 'charged once · FALSE', beliefCls: 'bad' },
 '3|giveup':  { v: 'red', code: 'CHARGED - AND WRITTEN OFF', body: 'The charge landed and you treated it as failed: the customer paid $100 for a booking your system believes never happened. Stripe: guessing wrong either way is catastrophic - this is the quieter catastrophe.', bank: ['attempt 1 · CHARGE $100'], mem: null, charged: '1×', chargedCls: 'bad', belief: 'failed · FALSE - customer paid', beliefCls: 'bad' },
 '3|key|acid': { v: 'green', code: 'THE RETRY WAS FREE', body: 'The retry carried the key, the server found the completed record, and replayed the saved result as if it were the first answer. One charge, correct answer. What the duplicate hears - saved result, same-meaning success, or silence - is Q4 whole question.', bank: ['attempt 1 · CHARGE $100 · K-1'], mem: 'K-1 · DONE', charged: '1×', chargedCls: 'good', belief: 'charged once · true', beliefCls: 'good' },
 '3|key|store': { v: 'green', code: 'THE RETRY WAS FREE', body: 'The state was safely written when the work finished, so the retry replayed the saved result. This memory holds here - it is cut 2 that betrays it. Same input, different cut, different verdict: the key’s memory question is really a crash question.', bank: ['attempt 1 · CHARGE $100 · K-1'], mem: 'K-1 · DONE', charged: '1×', chargedCls: 'good', belief: 'charged once · true', beliefCls: 'good' },
 '3|key|replica': { v: 'red', code: 'DOUBLE CHARGE WITH THE KEY ON', body: 'The record exists - on the master. The replica is seconds behind, answered "never seen this key", and the retry ran the charge again. This is Airbnb production scenario, and why Orpheus reads idempotency state from master only. Q2.', bank: ['attempt 1 · CHARGE $100 · K-1', 'retry · CHARGE $100 · K-1'], mem: 'K-1 · DONE (master)', rep: ' - K-1 not here yet - ', charged: '2×', chargedCls: 'bad', belief: 'charged once · FALSE', beliefCls: 'bad' }
 };

 function state() {
 if (cut === null) return START;
 if (act === null) return MID[cut];
 if (act === 'key' && shelf === null) { var m = MID[cut]; return Object.assign({}, NEEDSHELF, { bank: m.bank, charged: m.charged, chargedCls: m.chargedCls, belief: m.belief, beliefCls: m.beliefCls }); }
 return OUTCOMES[act === 'key' ? cut + '|key|' + shelf : cut + '|' + act];
 }

 function rows(el, arr) { el.innerHTML = (arr && arr.length) ? arr.join('<br>') : ' - empty - '; }

 function render() {
 $$('.abtn[data-cut]').forEach(function (b) { b.classList.toggle('sel', b.dataset.cut === String(cut)); });
 $$('.s-cutzone').forEach(function (z) { z.classList.toggle('sel', z.id === 'cut' + cut); });
 [1,2,3].forEach(function (n) { var t = document.getElementById('cutlab' + n); if (t) t.style.display = (cut === n) ? '' : 'none'; });
 $$('.abtn[data-act]').forEach(function (b) { b.disabled = (cut === null); b.classList.toggle('sel', b.dataset.act === act); });
 var showShelf = (act === 'key');
 $('#shelflabel').style.display = showShelf ? '' : 'none';
 $$('.abtn[data-shelf]').forEach(function (b) { b.style.display = showShelf ? '' : 'none'; b.classList.toggle('sel', b.dataset.shelf === shelf); });

 var s = state();
 var v = $('#averdict');
 v.className = 'averdict v-' + s.v;
 $('#vcode').textContent = s.code;
 $('#vbody').textContent = s.body;
 if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
 /* wells land first; the verdict eases in a beat later so attempt -> outcome
  reads as a sequence, not a snap (display only - the outcome is exact). */
 revealTimer = setTimeout(function () { v.classList.add('on'); }, cut === null ? 0 : 380);

 rows($('#bankrows'), s.bank);
 var memwell = $('#memwell');
 if (s.rep !== undefined) {
  $('#memlabel').textContent = 'KEY STORE · REPLICA BEING READ';
  memwell.classList.add('watched');
  rows($('#memrows'), [ 'master: ' + (s.mem || ' - '), 'replica: ' + s.rep ]);
 } else {
  $('#memlabel').textContent = 'KEY STORE';
  memwell.classList.remove('watched');
  rows($('#memrows'), s.mem ? [s.mem] : (act === 'key' || act === null && cut !== null ? [] : []));
 }
 $('#mcharged').textContent = s.charged;
 $('#mcharged').className = 'val ' + (s.chargedCls || '');
 $('#mbelief').textContent = s.belief;
 $('#mbelief').className = 'val ' + (s.beliefCls || '');
 }

 $$('.abtn[data-cut]').forEach(function (b) { b.addEventListener('click', function () { cut = Number(b.dataset.cut); act = null; shelf = null; render(); }); });
 $$('.s-cutzone').forEach(function (z) { z.addEventListener('click', function () { cut = Number(z.id.slice(3)); act = null; shelf = null; render(); }); });
 $$('.abtn[data-act]').forEach(function (b) { b.addEventListener('click', function () { act = b.dataset.act; shelf = null; render(); }); });
 $$('.abtn[data-shelf]').forEach(function (b) { b.addEventListener('click', function () { shelf = b.dataset.shelf; render(); }); });
 $('#areset').addEventListener('click', function () { cut = null; act = null; shelf = null; render(); });
 $('#ctxhide').addEventListener('click', function () { $('#artctx').style.display = 'none'; $('#ctxshow').style.display = ''; });
 $('#ctxshow').addEventListener('click', function () { $('#artctx').style.display = ''; $('#ctxshow').style.display = 'none'; });
 render();
}

// ---- the host bridge (this port) -----------------------------------------
// Size reporting for the embedding page, and the context-block default:
// folded when embedded (the reference page's on-page state), expanded when
// opened standalone (the cold visitor). Nothing here reaches into the
// engine's state.
function bootBridge() {
 var root = document.querySelector('#tryit-root .artifact');
 var embedded = true;
 try { embedded = window.parent !== window; } catch (e) { embedded = true; }
 if (!embedded) {
  var ctx = document.getElementById('artctx'), show = document.getElementById('ctxshow');
  if (ctx) ctx.style.display = '';
  if (show) show.style.display = 'none';
  // B2-9.3 (F22): the backlink shows only standalone (same tab). Embedded on
  // the problem page it would point at the page you're on, and target=_blank
  // is a no-op in the sandbox -- so it stays hidden inside the page.
  var bl = document.getElementById('tryit-backlink'); if (bl) bl.style.display = '';
 }
 function post(msg) {
  try { window.parent.postMessage(Object.assign({ v: 1, wall: WALL }, msg), '*'); } catch (e) {}
 }
 function postSize() {
  if (!root) return;
  post({ type: 'size', h: Math.ceil(root.getBoundingClientRect().height) });
 }
 var ro = null;
 if (typeof ResizeObserver !== 'undefined' && root) {
  ro = new ResizeObserver(function () { postSize(); });
  ro.observe(root);
 }
 /* The host's listener may attach after this frame boots (cached assets
  hydrate late), so the size is re-posted on a short schedule too. */
 var timers = [250, 600, 1200, 2500, 5000, 10000].map(function (ms) { return setTimeout(postSize, ms); });
 postSize();
 return function () { if (ro) ro.disconnect(); timers.forEach(clearTimeout); };
}

export default function ProblemAmbiguousTimeoutsTryIt() {
 useEffect(function () {
  bootEngine();
  return bootBridge();
 }, []);
 return (
  <>
   <style>{CSS}</style>
   <div id="tryit-root" dangerouslySetInnerHTML={{ __html: MARKUP }} />
  </>
 );
}
