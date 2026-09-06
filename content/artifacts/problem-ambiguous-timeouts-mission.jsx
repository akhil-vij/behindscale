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
// an effect; it touches none of the frozen code.
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
//   {text} · size {h} · anchor {id} | {frame:{top,height}}
// and receives init {commit}. The commit box stays inside the artifact
// (its grammar is frozen); persistence is the host's. The reader's skip is
// in-memory for the page's lifetime (the sandbox has no sessionStorage).
//
// Fonts: the fallback mono stack (no runtime JetBrains Mono fetch) -- a
// visual deviation from the reference, recorded in the PR. The .artB root
// drops the reference's page-breakout transform; the host wrapper owns the
// 960px breakout. No overscroll-behavior anywhere: at the frame's edges the
// page scroll must chain (owner ruling).

const WALL = 'ambiguous-failure-under-retry'

const CSS = `
 :root {
 --art-bg: #08090D; --art-surface: #0F1118; --art-surface-2: #161922;
 --art-border: #1F2333; --art-text: #C8CDD8; --art-muted: #6B7280;
 --art-border-interactive: #3a4158; --art-text-bright: #EDEFF3;
 --art-red: #ef4444; --art-amber: #eab308; --art-green: #22c55e;
 --accent-problem: #D946EF; --accent-problem-hover: #E879F9;
 --mono: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace;
 }
 #mission-root * { box-sizing: border-box; }
 #mission-root button { font-family: inherit; }
 #mission-root b { color: var(--art-text-bright); font-weight: 600; }
 .art-foot { color:var(--art-muted); font-size:10px; margin-top:12px; border-top:1px solid var(--art-border); padding-top:8px; line-height:1.7; }
 .art-foot a { color:var(--art-text); text-decoration:underline; }
 .artB { background:var(--art-bg); color:var(--art-text); border:1px solid var(--art-border); border-radius:14px; padding:16px; margin:0; font-family:var(--mono); font-size:12px; width: 100%; position: relative; }
 .a-eyebrow { color:var(--art-muted); font-size:10px; letter-spacing:2px; }
 .a-title { color:var(--art-text-bright); font-size:17px; font-weight:700; margin:3px 0 1px; }
 .a-sub { color:var(--art-muted); font-size:11px; }

 .evchips { display:flex; gap:6px; margin:14px 0 8px; flex-wrap:wrap; }
 .evchip { flex:1; min-width:96px; text-align:center; font-size:9.5px; letter-spacing:.6px; color:var(--art-muted); border:1px solid var(--art-border); border-radius:20px; padding:5px 4px; background:var(--art-surface); transition:all .25s; }
 .evchip.now { border-color:var(--art-text); color:var(--art-text-bright); box-shadow:0 0 10px rgba(200,205,216,.2); }
 .evchip.clean { border-color:#22c55e; color:#22c55e; }
 .evchip.hurt { border-color:#ef4444; color:#ef4444; }

 .narr { background:var(--art-surface-2); border:1px solid var(--art-border); border-radius:8px; padding:8px 12px; min-height:44px; font-size:11.5px; line-height:1.55; margin-bottom:10px; }
 .narr b { color:var(--art-text-bright); }
 .narr .tag { color:var(--art-muted); letter-spacing:1px; font-size:10px; }

 /* ===== layout: deck | stage ===== */
 .brow { display:flex; gap:12px; flex-wrap:wrap; }
 .deck { flex:0 1 250px; min-width:236px; background:var(--art-surface); border:1px solid var(--art-border); border-radius:10px; padding:12px; }
 #artB[data-cue="deck"] .deck { animation:deckpulse 1.6s ease infinite alternate; }
 @keyframes deckpulse { from { border-color:var(--art-border); } to { border-color:var(--accent-problem); box-shadow:0 0 14px rgba(217,70,239,.18);} }
 .deck-title { color:var(--art-text); font-size:10px; letter-spacing:1.6px; margin-bottom:2px; }
 .deck-sub { color:var(--art-muted); font-size:9.5px; margin-bottom:8px; }
 .kg { margin-top:10px; padding-top:8px; border-top:1px solid var(--art-border); }
 .kg:first-of-type { margin-top:2px; border-top:none; padding-top:0; }
 .kg .kgl { color:var(--art-muted); font-size:9.5px; letter-spacing:1px; display:flex; align-items:center; gap:6px; }
 .kg .kgl .q { color:var(--art-muted); }
 .kg .lockmsg { color:var(--art-muted); font-size:9px; font-style:italic; margin-top:3px; }
 .seg { display:flex; flex-direction:column; gap:4px; margin-top:5px; }
 .seg button { text-align:left; padding:6px 8px; border-radius:6px; cursor:pointer; border:1px solid var(--art-border-interactive); color:var(--art-text); background:var(--art-surface); font-family:inherit; font-size:10.5px; line-height:1.35; }
 .seg button:hover:not(:disabled) { border-color:var(--accent-problem); color:var(--accent-problem-hover); }
 .seg button.sel { border-color:var(--accent-problem); background:rgba(217,70,239,.14); color:var(--accent-problem-hover); font-weight:700; }
 .seg button:disabled { opacity:.35; cursor:not-allowed; }
 .kg.flashg { animation:gflash 1.1s ease 1; }
 @keyframes gflash { 0%,100% { background:transparent; } 35% { background:rgba(217,70,239,.14); border-radius:8px; } }
 .locked .seg button { pointer-events:none; opacity:.55; }

 .stagecol { flex:1 1 420px; min-width:380px; }
 .bstagewrap { overflow-x:auto; border-radius:10px; background:radial-gradient(ellipse at 50% 0%, var(--art-surface-2) 0%, var(--art-bg) 70%); border:1px solid var(--art-border); }
 svg#bstage { display:block; width:100%; min-width:560px; height:auto; }
 svg#bstage text { font-family:var(--mono); }
 .nodebox { fill:var(--art-surface-2); stroke:var(--art-border); stroke-width:1.4; }
 .nlab { fill:var(--art-text); font-size:12px; text-anchor:middle; letter-spacing:.5px; font-weight:600; }
 .nsub { fill:var(--art-muted); font-size:8.5px; text-anchor:middle; }
 .wire { stroke:var(--art-border); stroke-width:2; }
 .ghostbox { fill:none; stroke:var(--art-border); stroke-width:1.2; stroke-dasharray:4 3; }
 .memrow { fill:var(--art-text); font-size:8.5px; }
 .bankrow { fill:var(--art-text); font-size:9.5px; }
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

 .ctlrow { display:flex; gap:8px; align-items:center; margin-top:10px; flex-wrap:wrap; }
 .runbtn { background:var(--accent-problem); color:var(--art-bg); border:none; border-radius:8px; padding:10px 20px; font-family:inherit; font-size:12.5px; font-weight:700; letter-spacing:.06em; cursor:pointer; }
 .runbtn:hover { background:var(--accent-problem-hover); }
 .runbtn:disabled { opacity:.4; cursor:not-allowed; }
 .bghost { background:none; border:1px solid var(--art-border-interactive); color:var(--art-muted); border-radius:8px; padding:9px 12px; font-family:inherit; font-size:11px; cursor:pointer; }
 .bghost.on { border-color:var(--accent-problem); color:var(--accent-problem-hover); }
 .meters { display:flex; gap:8px; margin-left:auto; }
 .meter { text-align:center; background:var(--art-surface); border:1px solid var(--art-border); border-radius:8px; padding:5px 10px; min-width:64px; }
 .meter .n { font-size:16px; font-weight:700; color:var(--art-muted); }
 .meter .n.bad { color:#ef4444; } .meter .n.good { color:#22c55e; } .meter .n.warn { color:#eab308; }
 .meter .t { font-size:8px; color:var(--art-muted); letter-spacing:.5px; }

 .log { margin-top:12px; display:grid; gap:8px; max-height:280px; overflow-y:auto; }
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
 .lvl.locked2 { opacity:.35; pointer-events:none; }
 .lvl .lt { color:var(--art-text-bright); font-size:12px; font-weight:700; }
 .lvl .lq { margin-top:4px; font-size:11.5px; line-height:1.6; color:var(--art-text); }
 .lvl .opt { display:block; width:100%; text-align:left; padding:7px 9px; margin-top:6px; border-radius:6px; cursor:pointer; border:1px solid var(--art-border-interactive); color:var(--art-text); background:var(--art-surface); font-family:inherit; font-size:11px; }
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
 @media (max-width: 700px) {
 svg#bstage { min-width: 0; }
 .bstagewrap { overflow-x: visible; }
 .ctlrow { position: sticky; bottom: 8px; background: var(--art-bg); border: 1px solid var(--art-border); border-radius: 10px; padding: 8px; z-index: 5; }
 }
 @media (prefers-reduced-motion: reduce) {
 #artB[data-cue="deck"] .deck, #artB[data-cue="run"] .runbtn, #artB[data-cue="group"] .kg.cue-target, .bpulse, .shake { animation: none !important; }
 .averdict { transition: none !important; transform: none !important; }
 }
  .billpanel { margin-top:10px; background:var(--art-surface); border:1px solid var(--art-border); border-radius:8px; padding:10px 12px; font-size:11px; line-height:1.6; }
  .billhead { color:var(--art-muted); font-size:10px; letter-spacing:1.2px; margin-bottom:6px; }
  .billrow { color:var(--art-text); padding:3px 0; border-top:1px solid var(--art-surface-2); }
  .billrow.base { color:var(--art-text-bright); }
  .billrow .bl { color:var(--art-muted); font-size:9px; letter-spacing:1px; margin-right:6px; }
  .billrow .bs { color:var(--art-muted); font-size:9.5px; margin-left:6px; }
  #artB[data-cue="group"] .kg.cue-target { animation:deckpulse 1.6s ease infinite alternate; border-radius:8px; }
  .fixrow { margin-top:8px; }
  .rerunbtn { border-color:var(--accent-problem) !important; color:var(--accent-problem-hover) !important; font-weight:700 !important; }
  details.hints { margin-top:8px; }
  details.hints summary { cursor:pointer; color:var(--art-muted); font-size:10px; letter-spacing:1.2px; list-style:none; }
  details.hints summary::-webkit-details-marker { display:none; }
  .bcard .khint { color:var(--art-muted); }
 .debrief, .narr, .lvl .lq, #cmt-locked { font-size: 12.5px; max-width: 68ch; }
 .esc-head .esc-rest { font-size: 11.5px; letter-spacing: 0.2px; }
 .kgl .addtag { color: var(--art-amber); font-size: 9px; letter-spacing: 1px; margin-left: 6px; }
 #dmgtoast { display: none; }
 @media (max-width: 700px) {
 #dmgtoast { display: block; position: sticky; bottom: 66px; z-index: 6; background: var(--art-surface-2); border: 1px solid var(--art-border-interactive); border-radius: 8px; padding: 7px 10px; font-size: 10.5px; color: var(--art-text); cursor: pointer; opacity: 0; pointer-events: none; transition: opacity .25s; }
 #dmgtoast.on { opacity: 1; pointer-events: auto; }
 }
`

const MARKUP = `
<div id="mission-root">
<div class="artB" id="artB" data-cue="run">
 <div class="a-eyebrow">PROBLEM CLASS · AMBIGUOUS FAILURE UNDER RETRY - BUILD IT</div>
 <div class="a-title">The defense loop <span style="font-size:9px;letter-spacing:1.5px;border:1px solid #D946EF;color:#E879F9;border-radius:5px;padding:2px 7px;vertical-align:2px;font-weight:400;">BUILD IT</span></div>
 <div class="a-sub">You own this payment path. Make your six decisions below, then run the day. Surviving the day = 0 doubles, 0 lost sales, 0 mystery tickets.</div>

 <div class="evchips" id="evchips"></div>
 <div class="narr" id="narr" aria-live="polite"></div>

 <div class="brow">
      <div class="deck" id="deck" aria-label="Your six design decisions"></div>
  <div class="stagecol">
  <div class="bstagewrap"><svg id="bstage" viewBox="0 0 640 336" role="img" aria-label="Payment path: client, server, bank, and the key’s memory; traffic animates across it"></svg></div>
  <div class="ctlrow">
   <button class="runbtn" id="runbtn">RUN THE DAY - NAIVE ▶</button>
   <button class="bghost" id="stepbtn">STEP</button>
   <button class="bghost" id="fastbtn">2×</button>
   <button class="bghost" id="resetbtn">reset</button>
   <div class="meters">
   <div class="meter"><div class="n" id="m-dbl">-</div><div class="t">DOUBLES</div></div>
   <div class="meter"><div class="n" id="m-lost">-</div><div class="t">LOST SALES</div></div>
   <div class="meter"><div class="n" id="m-tick">-</div><div class="t">MYSTERY</div></div>
   </div>
  </div>
  <div id="dmgtoast" role="status"></div>
  </div>
 </div>

 <div class="billpanel" id="bill" style="display:none;"></div>

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

    <div class="log" id="log"></div>

 <div class="esc" id="escwrap" style="display:none;">
  <div class="esc-head"><span class="esc-lede">FIVE ATTACKS</span><span class="esc-rest"> - YOUR DESIGN SURVIVED A DAY. EACH ATTACK FLIPS ONE OF YOUR DECISIONS, OR ADDS ONE YOU HADN'T MADE. FIX IT WITH YOUR DECISIONS, THEN RE-RUN THE ATTACK. (ATTACK 1 IS THE EXCEPTION, AND SAYS SO.)</span></div>
  <div id="lvls"></div>
  <div class="debrief" id="debrief"></div>
 </div>


 </div>
 <div class="art-foot" id="mission-foot" style="display:none;"><a href="https://www.behindscale.com/problems/ambiguous-timeouts" target="_blank" rel="noopener noreferrer">From the full problem page at behindscale.com →</a></div>
</div>
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
 var speed = 1, userChoseSpeed = false, curEv = -1, running = false, won = false, evIdx = 0, dayDamage = null, touched = false, runsDone = 0;
 var dwellUntil = 0;
 var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var lvlDone = [false,false,false,false,false];

 /* dayTokens(): the RULES block, imported from ./problem-ambiguous-timeouts-rules.js (verbatim, frozen). */

 /* ---------- deck ---------- */
 var GROUPS = [
 { k:'id', q:'Q1', label:'IDENTITY - who names an operation?', opts:[
  ['none','nobody - a request is just its parameters'],
  ['hash','the server - hash the parameters'],
  ['key','the caller - sends a key it generated']] },
 { k:'mem', q:'Q2', label:'MEMORY - where does "seen it" live?', needs:function(){return K.id!=='none';}, lock:'memory needs a name - set identity first', opts:[
  ['none','nowhere - keep no record'],
  ['store','a separate store, written after the work'],
  ['storerec','a separate store, plus recovery steps that rebuild state on retry'],
  ['acid','committed with the work - one transaction']] },
 { k:'read', q:'Q2', label:'READS - which copy of the database answers "seen this?"', needs:function(){return K.mem!=='none';}, lock:'needs a memory to read', opts:[
  ['master','the master - where it was written'],
  ['replica','a replica - cheaper, seconds behind']] },
 { k:'cli', q:'', label:'CLIENT - on a timeout, it&hellip;', opts:[
  ['giveup','gives up - assumes it failed'],
  ['blind','retries as a brand-new request'],
  ['key','retries carrying the same identity']],
  optNeeds:{ key:function(){return K.id!=='none';} } },
 { k:'rep', q:'Q4', label:'REPLY - a recognized duplicate gets&hellip;', needs:function(){return K.mem!=='none';}, lock:'needs recognition to exist', opts:[
  ['err','an error - "already processed"'],
  ['saved','the saved result, as if first']] },
 { k:'ret', q:'Q5', label:'WINDOW - the memory is kept for&hellip;', needs:function(){return K.mem!=='none';}, lock:'needs a memory to keep', opts:[
  ['min','one minute'],
  ['day','~24 hours'],
  ['size','bounded by size - evict oldest first, page if it drops under 24h'],
  ['ever','forever']] },
 { k:'params', q:'', label:'SAME KEY, NEW PARAMS - the server&hellip;', needs:function(){return ROWS_ADDED.params;}, lock:'', hideLocked:true, opts:[
  ['run','runs it - the parameters are the request'],
  ['replay','replays the old result'],
  ['refuse','refuses, with a validation error naming the mismatch']] },
 { k:'after', q:'', label:'AFTER THE WINDOW - stragglers are&hellip;', needs:function(){return ROWS_ADDED.after;}, lock:'', hideLocked:true, opts:[
  ['nothing','nobody\'s problem - the window is the guarantee'],
  ['reconcile','caught by a reconciliation sweep against the partner\'s records']] }
 ];
 var STAGEMAP = { id:'sg-id', mem:'sg-mem', read:'sg-read', cli:'sg-cli', rep:'sg-rep', ret:'sg-ret' };

 function paintDeck(){
 var h = '<div class="deck-title">YOUR DECISIONS</div><div class="deck-sub">the day runs with whatever it says here</div>';
 GROUPS.forEach(function(g){
  var ok = !g.needs || g.needs();
  if (!ok && g.hideLocked) return;
  h += '<div class="kg" id="kg-'+g.k+'"><div class="kgl">'+g.label+(g.q?' <span class="q">'+g.q+'</span>':'')+'</div>';
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
 $$('#deck button').forEach(function(b){
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
  });
 });
 }

 /* ---------- stage geometry (fixed bands, nothing floats) ---------- */
 var GH = {
 client:{x:22,y:104,w:132,h:64}, server:{x:262,y:104,w:130,h:64}, bank:{x:472,y:64,w:150,h:136},
 wireY:132, idDot:{cx:176,cy:132}, repNote:{x:170,y:88},
 memNone:{x:272,y:214,w:110,h:34}, memStore:{x:396,y:214,w:118,h:34}, memAcid:{x:262,y:168,w:130,h:30},
 replica:{x:272,y:272,w:110,h:30}, clock:{cx:222,cy:236}
 };
 /* vertical G-map for phones: client -> server -> bank flows top-to-bottom */
 var GV = {
 client:{x:90,y:12,w:180,h:56}, server:{x:90,y:200,w:180,h:56}, bank:{x:76,y:396,w:208,h:114},
 wireX:180, wireY:0, idDot:{cx:180,cy:120}, repNote:{x:180,y:184},
 memNone:{x:196,y:296,w:112,h:32}, memStore:{x:196,y:296,w:120,h:34}, memAcid:{x:90,y:260,w:180,h:30},
 replica:{x:52,y:344,w:110,h:30}, clock:{cx:40,cy:250}
 };
 var VERT = false, G = GH;
 var stage = $('#bstage'), layerStatic, layerAnim;
 function el(name, attrs, parent, text){
 var e = document.createElementNS(NS, name);
 for (var k in attrs) e.setAttribute(k, attrs[k]);
 if (text !== undefined) e.textContent = text;
 (parent||stage).appendChild(e); return e;
 }
 function memRect(){ return K.mem==='acid' ? G.memAcid : G.memStore; }

 var bankEntries = [];
 function renderBank(){
 var host = document.getElementById('bBankrows'); if(!host) return;
 host.innerHTML='';
 var MAX=5, extra = bankEntries.length-MAX;
 var rows = bankEntries.slice(-MAX);
 var y = G.bank.y+36;
 if (extra>0){ el('text',{class:'bankrow',x:G.bank.x+12,y:y,fill:'#6B7280'},host,'+'+extra+' earlier \u2026'); y+=15; }
 rows.forEach(function(r){
  var t = el('text',{class:'bankrow '+(r.cls||'')+(r._new?' stampin':''),x:G.bank.x+12,y:y},host,r.txt); y+=15;
  r._el = t; r._new = false;
 });
 }
 function bankStamp(txt, cls){
 bankEntries.push({txt:txt, cls:cls||'', _new:true});
 renderBank();
 if (cls==='dbl') dwellUntil = Date.now() + 900; /* R3: dwell is real time, never /speed */
 if (cls==='dbl'){ var b=$('#bankbox'); b.classList.add('shake'); setTimeout(function(){b.classList.remove('shake');},900); }
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
 el('text',{class:'nlab',x:G.client.x+G.client.w/2,y:G.client.y+22},gCli,'CLIENT');
 var cliTxt = {giveup:'timeout \u2192 gives up', blind:'timeout \u2192 blind retry', key:'timeout \u2192 retry + key'}[K.cli];
 el('text',{class:'nsub',x:G.client.x+G.client.w/2,y:G.client.y+42},gCli,cliTxt);

 /* identity dot ON the wire, label BELOW the wire */
 var gId = el('g',{id:'sg-id'},S);
 if (K.id==='none') el('circle',{cx:G.idDot.cx,cy:G.idDot.cy,r:8,fill:'#08090D',stroke:'#6B7280','stroke-dasharray':'3 2.4','stroke-width':1.6},gId);
 if (K.id==='key') el('circle',{cx:G.idDot.cx,cy:G.idDot.cy,r:8,fill:'#B45309'},gId);
 if (K.id==='hash'){ el('circle',{cx:G.idDot.cx,cy:G.idDot.cy,r:8,fill:'#0891B2'},gId); el('text',{x:G.idDot.cx,y:G.idDot.cy+3.5,'text-anchor':'middle','font-size':'10',fill:'#08090D','font-weight':'700'},gId,'#'); }
 el('text',{class:'nsub',x:G.idDot.cx,y:G.idDot.cy+22},gId,{none:'no identity',hash:'param hash',key:'caller key'}[K.id]);

 /* reply annotation in the reserved top band */
 if (K.mem!=='none'){
  var gRep = el('g',{id:'sg-rep'},S);
  el('text',{class:'nsub',x:G.repNote.x,y:G.repNote.y},gRep,'duplicate reply:');
  el('text',{class:'nsub',x:G.repNote.x,y:G.repNote.y+11,fill:'#C8CDD8'},gRep,K.rep==='err'?'"ERROR: already processed"':'the saved result');
 }

 /* server */
 el('rect',{class:'nodebox',id:'serverbox',x:G.server.x,y:G.server.y,width:G.server.w,height:G.server.h,rx:8},S);
 el('text',{class:'nlab',x:G.server.x+G.server.w/2,y:G.server.y+24},S,'SERVER');
 el('text',{class:'nsub',x:G.server.x+G.server.w/2,y:G.server.y+42},S,'charges the bank');

 /* bank */
 el('rect',{class:'nodebox',id:'bankbox',x:G.bank.x,y:G.bank.y,width:G.bank.w,height:G.bank.h,rx:8},S);
 el('text',{class:'nlab',x:G.bank.x+G.bank.w/2,y:G.bank.y+20},S,'BANK LEDGER');
 el('g',{id:'bBankrows'},S);
 renderBank();

 /* memory */
 var gMem = el('g',{id:'sg-mem'},S);
 if (K.mem==='none'){
  el('rect',{class:'ghostbox',x:G.memNone.x,y:G.memNone.y,width:G.memNone.w,height:G.memNone.h,rx:7},gMem);
  el('text',{class:'nsub',x:G.memNone.x+G.memNone.w/2,y:G.memNone.y+21,fill:'#6B7280'},gMem,'NO MEMORY');
 } else if (K.mem==='store'){
  var m=G.memStore;
  el('line',{class:'wire',x1:G.server.x+G.server.w-16,y1:G.server.y+G.server.h,x2:m.x+26,y2:m.y},gMem);
  el('text',{class:'nsub',x:m.x+m.w/2,y:m.y-6},gMem,'written AFTER the work');
  el('rect',{class:'nodebox',x:m.x,y:m.y,width:m.w,height:m.h,rx:7},gMem);
  el('text',{class:'nsub',x:m.x+m.w/2,y:m.y+14,fill:'#C8CDD8'},gMem,'KEY STORE (separate)');
  el('text',{class:'memrow',x:m.x+8,y:m.y+27,id:'memrow'},gMem,'');
 } else {
  var a=G.memAcid;
  el('rect',{class:'nodebox',x:a.x,y:a.y,width:a.w,height:a.h,rx:7,'stroke-width':2.2},gMem);
  el('text',{class:'nsub',x:a.x+a.w/2,y:a.y+13,fill:'#C8CDD8'},gMem,'MEMORY \u22C8 WORK');
  el('text',{class:'memrow',x:a.x+8,y:a.y+25,id:'memrow'},gMem,'one commit');
 }

 if (K.mem!=='none'){
  /* read pointer + replica */
  var gRead = el('g',{id:'sg-read'},S);
  var m2 = memRect();
  var tx = K.read==='master' ? {x:m2.x+m2.w/2,y:m2.y+(K.mem==='acid'?m2.h:0)} : {x:G.replica.x+G.replica.w/2,y:G.replica.y};
  el('line',{class:'readptr',id:'readline',x1:G.server.x+24,y1:G.server.y+G.server.h,x2:tx.x-16,y2:tx.y+4},gRead);
  el('text',{class:'nsub',x:G.server.x+2,y:G.server.y+G.server.h+30,'text-anchor':'start',fill:'#eab308'},gRead,'reads: '+(K.read==='master'?'master':'REPLICA (lags)'));
  el('rect',{class:'ghostbox',x:G.replica.x,y:G.replica.y,width:G.replica.w,height:G.replica.h,rx:7,id:'replicabox'},S);
  el('text',{class:'nsub',x:G.replica.x+G.replica.w/2,y:G.replica.y+13},S,'REPLICA');
  el('text',{class:'nsub',x:G.replica.x+G.replica.w/2,y:G.replica.y+24,id:'replicanote'},S,'~seconds behind');
  /* clock */
  var gRet = el('g',{id:'sg-ret'},S);
  el('circle',{cx:G.clock.cx,cy:G.clock.cy,r:12,fill:'none',stroke:'#8A8A94','stroke-width':1.4},gRet);
  el('line',{x1:G.clock.cx,y1:G.clock.cy,x2:G.clock.cx,y2:G.clock.cy-8,stroke:'#8A8A94','stroke-width':1.4,id:'clockhand'},gRet);
  el('text',{class:'nsub',x:G.clock.cx,y:G.clock.cy+28},gRet,'keeps: '+({min:'1 min',day:'~24 h',ever:'forever'}[K.ret]));
 }
 }
 function memNote(txt){ var m=document.getElementById('memrow'); if(m) m.textContent = txt; }

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
 if(label) el('text',{x:x,y:y-14,'text-anchor':'middle','font-size':'9',fill:'#ef4444'},g,label);
 setTimeout(function(){ g.style.transition='opacity 1s'; g.style.opacity=0; }, Math.max(800, 1400/speed));
 return sleep(500);
 }
 function say(tag, html){ $('#narr').innerHTML = '<span class="tag">'+tag+'</span> · '+html; }
 function flashServer(color){
 var b=$('#serverbox'); b.setAttribute('stroke',color); b.classList.add('bpulse');
 return sleep(700).then(function(){ b.classList.remove('bpulse'); b.setAttribute('stroke','#1F2333'); });
 }
 function checkMemory(found, fromReplica){
 var m2 = fromReplica? G.replica : memRect();
 var yTop = fromReplica? m2.y : (K.mem==='acid'? m2.y+m2.h : m2.y);
 var line = el('line',{x1:G.server.x+34,y1:G.server.y+G.server.h,x2:m2.x+m2.w/2,y2:yTop,stroke: found?'#22c55e':'#ef4444','stroke-width':2,'stroke-dasharray':'4 3'},layerAnim);
 var lbl = el('text',{x:m2.x+m2.w/2+6,y:yTop-5,'font-size':'9',fill:found?'#22c55e':'#ef4444','text-anchor':'start'},layerAnim, found?'seen it \u2713':'never seen');
 setTimeout(function(){ line.remove(); lbl.remove(); }, 1600/speed);
 return sleep(650);
 }

 var CX,SX,SXR,BX,Y;
 function refreshXY(){ CX=G.client.x+G.client.w; SX=G.server.x; SXR=G.server.x+G.server.w; BX=G.bank.x; Y=G.wireY; }
 function pickG(){ VERT = window.innerWidth < 700; G = VERT ? GV : GH; refreshXY(); stage.setAttribute('viewBox', VERT ? '0 0 360 520' : '0 0 640 336'); }
 pickG();
 window.addEventListener('resize', function(){ var v = window.innerWidth < 700; if (v !== VERT && !running){ pickG(); drawStage(); layerAnim = el('g',{}); } });
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
 var r, lbl;
 if (VERT){
  r = dot(GV.wireX-18, G.server.y-4, kind==='err'?'err':'reply');
  await move(r, GV.wireX-18, G.client.y+G.client.h+16, 480);
  lbl = el('text',{x:GV.wireX-24,y:G.client.y+G.client.h+32,'font-size':'9',fill: kind==='err'?'#ef4444':'#22c55e','text-anchor':'end'},layerAnim, txt);
 } else {
  r = dot(SX-4, Y-14, kind==='err'?'err':'reply');
  await move(r, CX+16, Y-14, 480);
  lbl = el('text',{x:CX+22,y:Y-24,'font-size':'9',fill: kind==='err'?'#ef4444':'#22c55e','text-anchor':'start'},layerAnim, txt);
 }
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
 {chip:'1 · ROUTINE'}, {chip:'2 · DROPPED REQ'}, {chip:'3 · MID-WORK CRASH'},
 {chip:'4 · LOST REPLY'}, {chip:'5 · IDENTICAL ORDERS'}, {chip:'6 · LATE RETRY'}
 ];
 function card(cls, code, body, src, knob){
 var d=document.createElement('div'); d.className='bcard '+cls;
 d.innerHTML='<span class="code">'+(curEv>=0?('E'+(curEv+1)+' \u00B7 '):(curLvl>0?('A'+curLvl+' \u00B7 '):''))+code+'</span><div>'+body+(knob?' <span class="kl" data-knob="'+knob+'">\u2192 the decision</span> \u00b7 <a class="khint" href="#'+(({id:'q1',cli:'q1',read:'q2',mem:'q3',rep:'q4',ret:'q5',params:'q6',after:'q6'})[knob]||'q1')+'">hint \u2193</a>':'')+'</div>'+(src?'<div class="src">'+src+'</div>':'');
 $('#log').prepend(d);
 d.querySelectorAll('.kl').forEach(function(k){ k.addEventListener('click', function(){
  var kg = document.getElementById('kg-'+k.dataset.knob);
  if (kg){ var kr=kg.getBoundingClientRect(); window.scrollTo({top: kr.top + window.pageYOffset - (window.innerHeight-kr.height)/2, behavior:'smooth'}); kg.classList.remove('flashg'); void kg.offsetWidth; kg.classList.add('flashg'); }
 });});
 }
 function idKind(){ return K.id==='key'?'key': K.id==='hash'?'hash':'plain'; }

 var EVENTS = [
 async function routine(){
  if (runsDone>0){ say('EVENT 1/6','Routine ✓ - compressed on repeat runs.'); bankStamp('+ $100 CHARGE'); if(K.mem!=='none') memNote('K-4 ✓'); await sleep(700); return {cls:'good'}; }
  say('EVENT 1/6','Routine traffic. A charge crosses, the bank stamps it, the answer comes home. This is the day when nothing goes wrong.');
  var d = await animRequest(idKind()); await chargeBank(d); if(K.mem!=='none') memNote('K-4 \u2713 remembered');
  await replyBack('ok','\u2713 charged');
  return {cls:'good'};
 },
 async function cut1(t){
  say('EVENT 2/6','<b>The wire drops a request</b> - it never reaches the server. The client holds a timeout and nothing else.');
  await animRequest(idKind(), {dieOnWire:true});
  if (t==='LOST_SALE'){ say('EVENT 2/6','The client <b>gives up</b>. Nothing was charged - and nothing ever will be. The sale evaporates.');
  card('bad','SALE EVAPORATED','Assumed failure, never retried - the booking silently vanished.','Stripe: assume failure on a success and the customer never gets what they paid for; assume it here and you drop real revenue.','cli');
  return {cls:'bad'}; }
  say('EVENT 2/6','The client retries'+(K.cli==='key'?' <b>carrying the same key</b>':' as a brand-new request')+'. Nothing had happened, so this one lands clean'+(K.cli==='blind'?' - <b>by luck</b>: from the client seat this cut is indistinguishable from event 4':'')+'.');
  var d2 = await animRequest(K.cli==='key'?idKind():'plain');
  if (K.cli==='key' && K.mem!=='none') await checkMemory(false);
  await chargeBank(d2); await replyBack('ok','\u2713 charged');
  return {cls:'good'};
 },
 async function cut2(t){
  say('EVENT 3/6','<b>The server dies mid-charge.</b> Did the bank move the money first? Even the ledger holds a question mark.');
  var d = await animRequest(idKind());
  await intoServer(d);
  await flashServer('#ef4444');
  if (t==='TICKET_MYST'){ await kill(d,'crash'); bankStamp('$100? · UNKNOWN','dbl');
  card('warn','MYSTERY TICKET','Charged or not? Nobody on either end knows - a support agent finds out next week.','Shopify: the still-wrong cases end in reconciliation - verify the money afterward.','cli');
  return {cls:'warn'}; }
  if (t==='DBL_CRASH'){ bankStamp('+ $100 CHARGE'); await kill(d,'crash after charging');
  say('EVENT 3/6','The retry arrives as a stranger - the server has no way to recognize it.');
  var r=await animRequest('plain'); await chargeBank(r,'dbl','+ $100 AGAIN \u26A0');
  card('bad','DOUBLE CHARGE (CRASH + UNRECOGNIZED RETRY)','First attempt charged before dying; the retry charged again.','Stripe: the retry must carry something the server can recognize - the whole idempotency-key idea.','id');
  return {cls:'bad'}; }
  if (t==='DBL_GAP'){ bankStamp('+ $100 CHARGE'); await kill(d,'crash before memory write');
  say('EVENT 3/6','The work finished - but the crash landed <b>before the separate store recorded it</b>. Memory and work parted ways.');
  var r2=await animRequest('key'); await checkMemory(false); await chargeBank(r2,'dbl','+ $100 AGAIN \u26A0'); memNote('K \u2713 (retry only)');
  card('bad','DOUBLE CHARGE - THE GAP','The retry found "never seen" and charged again. (The crash could as easily have landed before the charge - this memory gambles on where.)','AWS: record the token and make the changes one all-or-nothing unit. Stripe names the same gap: recovery is "heavily dependent on implementation."','mem');
  return {cls:'bad'}; }
  if (t==='CLEAN_RECOVERY'){ bankStamp('+ $100 CHARGE'); await kill(d,'crash mid-steps');
   say('EVENT 3/6','The store recorded <b>which steps already ran</b>. The retry triggers recovery steps that rebuild the state first - only one request ever reaches the partner.');
   var rr=await animRequest('key'); await checkMemory(true); memNote('steps recorded \u00b7 rebuilding'); await sleep(600); rr.remove(); await replyBack('ok','\u2713 charged (recovered)');
   card('good','SURVIVED - RECOVERY STEPS REBUILT THE STATE','The crash interrupted the work; the store knew how far it got, and the retry finished the job without touching the partner twice. The price is on the bill: recovery code per step.','Shopify 2022; Airbnb 2019 buys the same safety with three all-or-nothing phases.',null);
   return {cls:'good'}; }
  var stamp = bankStamp('+ $100 CHARGE'); await kill(d,'crash');
  say('EVENT 3/6','Memory and work were <b>one commit</b> - the crash erases both together. Watch the ledger take the charge back.');
  await sleep(550); bankAmend(stamp,'$100 · rolled back','gone');
  var r3=await animRequest('key'); await checkMemory(false); await chargeBank(r3); memNote('K \u2713'); await replyBack('ok','\u2713 charged');
  card('good','CLEAN - THE CRASH ROLLED BACK','One commit means the half-failures are not allowed to exist. The retry found nothing and ran fresh.','AWS; Airbnb buys the same safety with three all-or-nothing phases; Shopify with recovery steps.',null);
  return {cls:'good'};
 },
 async function cut3(t){
  say('EVENT 4/6','<b>The charge lands - and the answer dies on the way home.</b> The ledger says $100. The client sees only a timeout.');
  var d = await animRequest(idKind()); await chargeBank(d); if(K.mem!=='none') memNote('K-9 \u2713');
  await replyDies();
  if (t==='TICKET_WRITEOFF'){ card('bad','CHARGED - AND WRITTEN OFF','The client believes it failed. The customer paid $100 for a booking your system denies.','Stripe: the quieter catastrophe.','cli'); return {cls:'bad'}; }
  if (t==='DBL_CLASSIC'){ say('EVENT 4/6','The retry arrives unrecognized and does it all again.');
  var d2=await animRequest(K.cli==='key'?idKind():'plain'); if(K.cli==='key'&&K.mem!=='none') await checkMemory(false); await chargeBank(d2,'dbl','+ $100 AGAIN \u26A0');
  card('bad','THE CLASSIC DOUBLE CHARGE','Work done, answer lost, done again. 0.6% of ALL events at Segment in a four-week window - a constant, not an edge case.','Segment 2017. Every system on this page exists because of this ending.', K.id==='none'?'id':'mem');
  return {cls:'bad'}; }
  if (t==='DBL_REPLICA'){ say('EVENT 4/6','The retry asks <b>the replica</b> - which hasn\'t heard yet.');
  var rn=document.getElementById('replicanote'); if(rn) rn.textContent='K-9? not here yet';
  var d3=await animRequest('key'); await checkMemory(false,true); await chargeBank(d3,'dbl','+ $100 AGAIN \u26A0');
  card('bad','DOUBLE CHARGE - WITH THE KEY ON','The record exists, on the master. The copy answering was seconds behind.','Airbnb: a copy that runs seconds behind turns a correct retry into a double charge - Orpheus reads from the master only.','read');
  return {cls:'bad'}; }
  if (t==='CLEAN_ERR_REPLY'){ say('EVENT 4/6','The retry is recognized - and answered with an <b>error: "already processed"</b>. No double charge. The price lands on the caller.');
  var d4=await animRequest('key'); await checkMemory(true); d4.remove(); await replyBack('err','"ERROR: already processed"');
  card('good','SURVIVED - BUT THE CALLER PAYS','One charge, correct outcome - and every caller must now write branching code that treats this error as a success. That price is on the bill.','AWS 2021: idempotent, but exactly what makes retry-by-default hard to offer. Stripe/Airbnb replay the saved result instead - and pay in stored results.','rep');
  return {cls:'good'}; }
  say('EVENT 4/6','The retry is recognized - and the server <b>replays the saved result</b> as if it were the first answer.');
  var d5=await animRequest('key'); await checkMemory(true); d5.remove(); await replyBack('ok','\u2713 charged (replayed)');
  card('good','THE RETRY WAS FREE','One charge, correct answer - the saved result replayed.','Stripe / Airbnb; AWS sharpens the reply to "same-meaning success".',null);
  return {cls:'good'};
 },
 async function twins(t){
  say('EVENT 5/6','A merchant sends <b>two identical $100 orders on purpose</b>. Same parameters. Different intent.');
  var a = await animRequest(idKind()); await chargeBank(a);
  var b = await animRequest(idKind());
  if (t==='LOST_TWIN'){ await checkMemory(true); await kill(b,'"duplicate" - dropped');
  card('bad','TWO ORDERS, ONE CHARGE','The parameter hash said "seen it" and silently dropped the second. A fingerprint of the parameters cannot tell an accidental repeat from a customer who really wants two identical orders.','AWS: identical parameters do not mean identical intent - only the CALLER knows intent, so the caller names the operation.','id');
  return {cls:'bad'}; }
  if (K.id==='key' && K.mem!=='none') await checkMemory(false);
  await chargeBank(b,'','+ $100 CHARGE (2nd)');
  card('good','BOTH ORDERS LANDED','Two operations, two names'+(K.id==='key'?' - the caller minted a fresh key for the second':'')+', two charges. Intent survived.', K.id==='key'?'AWS: the token carries intent, so twins are distinguishable by name.':'', null);
  return {cls:'good'};
 },
 async function late(t){
  if (t==='NA'){ say('EVENT 6/6','A client wakes up late and retries - but with no working recognition, this is just the earlier failures again. (Fix those first.)'); await sleep(700); return {cls:'good'}; }
  say('EVENT 6/6','<b>Three minutes later</b>, a mobile client wakes up and retries an old charge with its old key.');
  var hand=document.getElementById('clockhand'); if(hand){ hand.style.transition='transform .8s'; hand.style.transformOrigin=G.clock.cx+'px '+G.clock.cy+'px'; hand.style.transform='rotate(160deg)'; }
  await sleep(850);
  if (t==='DBL_EXPIRE'){ say('EVENT 6/6','The one-minute memory <b>has already forgotten</b>.');
  var d=await animRequest('key'); await checkMemory(false); await chargeBank(d,'dbl','+ $100 AGAIN \u26A0');
  card('bad','THE MEMORY EXPIRED FIRST','The key was real; the memory had already let it go.','AWS: keep tokens too briefly and a late retry duplicates the resource. Shopify: the window is a dial you set on purpose (~24h).','ret');
  return {cls:'bad'}; }
  if (K.ret==='ever'){ var d2=await animRequest('key'); await checkMemory(true); d2.remove(); await replyBack('ok','\u2713 (replayed)');
  card('good','LATE, AND STILL REMEMBERED - FOREVER','Replayed fine. The price is on the bill: every key ever seen, kept without bound.','AWS 2021 names both costs of the too-long window.',null);
  return {cls:'good'}; }
  if (K.ret==='size'){ var d2b=await animRequest('key'); await checkMemory(true); d2b.remove(); await replyBack('ok','\u2713 (replayed)');
  card('good','LATE, BUT INSIDE THE (CURRENTLY FULL-SIZE) WINDOW','Three minutes is nothing today. Under heavy load this window shrinks - that price is on the bill, and one of the attacks below is about exactly this.','Segment 2017: bound by size, evict oldest first, page if it thins past a day.',null);
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
 set('#m-dbl',dmg.dbl,'bad'); set('#m-lost',dmg.lost,'bad'); set('#m-tick',dmg.tick,'warn');
 }
 function lock(on){ $('#artB').classList.toggle('locked', on); $('#runbtn').disabled=on; $('#stepbtn').disabled=on; }

 async function playEvent(i){
 curEv = i;
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
 }
 function renderBill(bill){
  var host=$('#bill'); if(!host) return;
  if(!bill || !bill.length){ host.style.display='none'; return; }
  host.style.display='';
  var rows = bill.map(function(b){
   return '<div class="billrow'+(b.base?' base':'')+'">'+(b.base?'<span class="bl">BASELINE</span> ':'')+b.c+' <span class="bs">'+b.s+'</span></div>';
  }).join('');
  host.innerHTML='<div class="billhead">THE BILL - what your surviving design pays</div>'+rows;
 }
 async function finishDay(){
 runsDone++;
 var rb=$('#runbtn'); rb.innerHTML='RUN AGAIN ▶';
 $('#artB').dataset.cue = dayDamage.win ? '' : 'deck';
 if(runsDone===1 && speed===1 && !userChoseSpeed){ speed=2.2; $('#fastbtn').classList.add('on'); $('#fastbtn').textContent='1\u00D7'; }
 if (dayDamage.extra==='NONAME') card('warn','A NAME WITH NO MEMORY','Requests carry an identity but the server keeps no record - recognition never actually happens.','Stripe: the server ties the key to state ON ITS SIDE - the key alone is half the machine.','mem');
 meters(dayDamage);
 renderBill(dayDamage.win ? dayDamage.bill : null);
 if (dayDamage.win){
  say('DAY SURVIVED','Zero damage - and a bill. Every safe design pays something; yours is itemized on the right. Now hold it: <b>the attacks below are how the five posts say designs like yours still break.</b>');
  card('good','DAY SURVIVED','Zero double charges, zero lost sales, zero mystery tickets. The bill lists what this design pays for that - each line named by the company that paid it first.','', null);
  if (!won){ won = true; buildLevels(); }
  $('#escwrap').style.display='';
 } else {
  say('DAY OVER','Read the damage. Every card points at one of your decisions. The five answers below are the hint sheet - adjust and run again.');
 }
 }
 async function runAll(){
 if (running) return;
 if (escMode>=0){ if (!FREE){ say('ATTACK ACTIVE','Finish the attack first - fix it with your decisions and re-run it. The day waits.'); return; } escAbandon(); }
 running=true; lock(true); $('#artB').dataset.cue='';
 freshDay();
 for (var i=0;i<6;i++) await playEvent(i);
 await finishDay(); lock(false); running=false;
 }
 async function stepOne(){
 if (running) return;
 if (escMode>=0){ if (!FREE){ say('ATTACK ACTIVE','Finish the attack first - fix it with your decisions and re-run it. The day waits.'); return; } escAbandon(); }
 if (evIdx===0 || evIdx>=6) freshDay();
 running=true; lock(true); $('#artB').dataset.cue='';
 await playEvent(evIdx); evIdx++;
 if (evIdx>=6) await finishDay();
 else say('PAUSED','Event '+evIdx+' of 6 done. STEP for the next - the day is one design, so your decisions stay fixed mid-day.');
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
  memNote('params DIFFER \u26A0'); await sleep(900); return d;
 }
 async function animReconcileSweep(){
  say('RECONCILIATION','A sweep compares your record against the bank\'s\u2026');
  var sweep=el('line',{x1:G.bank.x,y1:G.bank.y+8,x2:G.bank.x,y2:G.bank.y+G.bank.h-8,stroke:'#22c55e','stroke-width':2},layerAnim);
  var t0=null; await new Promise(function(res){ function f(ts){ if(!t0)t0=ts; var p=Math.min(1,(ts-t0)/(1200/speed)); sweep.setAttribute('x1',G.bank.x+p*G.bank.w); sweep.setAttribute('x2',G.bank.x+p*G.bank.w); if(p<1)requestAnimationFrame(f); else res(); } requestAnimationFrame(f); });
  sweep.remove(); bankStamp('\u2212 $100 ANOMALY \u00b7 refunded \u2713');
 }

 var LEVELS = [
  { t:'A1 \u00b7 STRIPE - AN INTEGRATOR REUSES LAST WEEK\'S KEY FOR A NEW CHARGE', group:null,
   brief:'The one attack no decision fixes - and finding that out is the level. Change anything you like, then re-run.',
   attack: async function(){
    say('ATTACK 1','A request arrives wearing <b>last week\'s key</b> - for a brand-new charge.');
    await animOldKeyReplay();
    say('ATTACK 1','The server did its job perfectly - and the new charge <b>silently never happened</b>. Nothing on your stage even looks wrong. Change any decision, then re-run the attack.');
   },
   rerun: async function(){
    await animOldKeyReplay(); l1Tried = true;
    card('bad','THE NEW CHARGE STILL NEVER HAPPENED','Nothing in your decisions can see this - two requests with the same key are duplicates by definition. That is the contract itself.','Stripe 2017.',null);
    return { held:false, showAccept:true };
   },
   accept:'Accept: this is caller discipline, not a server decision',
   acceptBody:'Stripe\'s actual answer: correctness here depends on key hygiene in every integrating codebase - which is why the post urges APIs to make idempotency explicit and documented. Publish the key rules; scope keys per operation. The one attack you cannot fix with a decision.',
   hints:[
    ['add server-side detection of stale keys','There is no signal to detect - two requests with the same key are duplicates BY DEFINITION.'],
    ['switch identity to a parameter hash','That reopens the identical-orders trap - a hash cannot carry intent.'],
    ['publish key rules; scope keys per operation','This is the answer - and it lives in documentation and client code, not in your decisions here.'] ] },

  { t:'A2 \u00b7 AIRBNB - A DBA MOVES YOUR KEY READS TO THE REPLICAS', group:'read',
   brief:'This attack flips one of your decisions. Fix it with your decisions, then re-run.',
   attack: async function(){
    say('ATTACK 2','Master capacity is expensive. Someone points key reads at <b>the replica - a copy seconds behind</b>\u2026');
    K.read='replica'; drawStage(); paintDeck(); layerAnim=el('g',{}); await sleep(650);
    await animCut3Replay();
    say('ATTACK 2','Seconds of lag, and the double charge is back - <b>with the key on</b>. Your READS decision changed under you; it stays changed until you change it back.');
   },
   rerun: async function(){
    var held = await animCut3Replay();
    if (held){ card('good','HELD - THE RETRY ASKED THE MASTER','The record was where it was written, and the replay was free. Airbnb kept key reads on the master and won the capacity back by splitting the key tables across machines.','Airbnb 2019.',null); }
    else { card('bad','BROKE AGAIN - THE REPLICA HAD NOT HEARD','The record exists, on the master. The copy answering was seconds behind.','Airbnb 2019: a copy that runs seconds behind turns a correct retry into a double charge.','read'); }
    return { held:held };
   },
   hints:[
    ['approve - seconds of lag is nothing','Seconds of lag is a double charge - you watched it.'],
    ['reads stay on master; shard on the key to win capacity back','Airbnb\'s answer verbatim - and the fix is the READS decision.'],
    ['shorten the replication lag instead','A smaller gamble is still a gamble - the guarantee would ride on a race you do not control.'] ] },

  { t:'A3 \u00b7 SEGMENT - TRAFFIC 10\u00D7s FOR A WEEK', group:'ret',
   brief:'Ten times the traffic, and your window decision is under attack. Fix it, then re-run.',
   attack: async function(){
    if (K.ret==='ever'){
     say('ATTACK 3','Ten times the traffic. Your store forgets nothing - so nothing is evicted. Watch it hold, and watch what it costs\u2026');
     await animBurstThenStraggler(); memNote('holding EVERYTHING \u00b7 store ballooning'); await sleep(800);
     await animLateKey(true);
     say('ATTACK 3','No straggler - and a store growing with all of history. Re-run to confirm, or change the WINDOW decision and see the other trades.');
    } else if (K.ret==='size'){
     say('ATTACK 3','Ten times the traffic. Your size-bound store evicts oldest-first by design - and under this much load, honest keys age out early\u2026');
     await animBurstThenStraggler(); memNote('evict oldest \u00b7 window shrinking \u00b7 PAGED'); await sleep(800);
     await animLateKey(false);
     say('ATTACK 3','A straggler aged out early and charged twice - the pager fired, exactly as designed. Re-run to see the posture hold, with its price.');
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
     card('good','HELD - THE WINDOW SHRANK ON PURPOSE','Bound by size, evict oldest first: the spike shrinks the protection window instead of toppling the store, and a pager fires if it thins past a day. Protection degraded gracefully - that price is already on your bill.','Segment 2017. "Almost exactly once" is the honest name.',null);
     return { held:true };
    }
    if (K.ret==='ever'){
     memNote('holding EVERYTHING \u00b7 store ballooning'); await sleep(700);
     await animLateKey(true);
     card('warn','HELD - BY REFUSING TO FORGET','No key was evicted, so no straggler doubled. The bill turns red instead: keys kept without bound, and under 10\u00D7 load the store grows without bound too. It holds - at a price the five posts warn about.','AWS 2021; Airbnb 2019: the table grows with traffic and is hard to trim.','ret');
     return { held:true };
    }
    memNote('oldest keys evicted \u2192'); await sleep(700);
    await animLateKey(false);
    card('bad','BROKE AGAIN - KEYS AGED OUT EARLY','A fixed-time window can\'t hold 10\u00D7 the keys; the oldest fell off before their retries arrived.','Segment 2017: the answer is to bound by size and let the window shrink, paged.','ret');
    return { held:false };
   },
   hints:[
    ['grow the store without limit','It holds the attack - and the bill goes red on storage. Try it and see.'],
    ['bound by size, evict oldest, page under 24h','Segment\'s design - the WINDOW decision has this option.'],
    ['turn dedupe off under load','The spike is when retries multiply - you would disarm the defense at peak attack.'] ] },

  { t:'A4 \u00b7 AWS - A KNOWN KEY ARRIVES WITH A DIFFERENT AMOUNT', group:'params',
   brief:'This attack adds a decision you hadn\'t made. It defaults to the naive answer - re-run and watch it break, then fix it.',
   attack: async function(){
    say('ATTACK 4','Same key as this morning - but the amount changed: <b>$250, not $100</b>. Your decisions never covered this. A new row just appeared - defaulted to the naive answer.');
    ROWS_ADDED.params = true; if(!K.params) K.params='run'; paintDeck();
    var d = await animParamsMismatch(); d.remove();
   },
   rerun: async function(){
    var d = await animParamsMismatch();
    if (K.params==='refuse'){ d.remove(); await replyBack('err','"VALIDATION: params changed"');
     card('good','HELD - THE MISMATCH WAS CAUGHT AND NAMED','The stored parameters exist precisely so this collision can be seen. The safest reading is that the customer meant something different - refuse, and say why.','AWS 2021: the guarantee protects INTENT.',null);
     return { held:true };
    }
    if (K.params==='replay'){ d.remove(); await replyBack('ok','\u2713 ($100 - the OLD result)');
     card('bad','BROKE - THE CUSTOMER ASKED FOR $250 AND SILENTLY GOT $100','The old result replayed for a new request. That is the reused-key failure from attack 1 - now endorsed by the server.','AWS 2021.','params');
     return { held:false };
    }
    await chargeBank(d,'dbl','+ $250 CHARGE \u00b7 SAME KEY \u26A0');
    card('bad','BROKE - ONE KEY NOW MEANS TWO THINGS','The charge ran. The same key produced two different operations, so the contract that made every retry safe just dissolved.','AWS 2021: two requests with the same token are duplicates by definition - or the definition is gone.','params');
    return { held:false };
   },
   hints:[
    ['run it - the parameters are the request','Then the same key means two things - re-run and watch the contract dissolve.'],
    ['replay the old result','The customer asked for something different and silently gets the old thing.'],
    ['refuse with a validation error','AWS\'s answer - the new row has this option.'] ] },

  { t:'A5 \u00b7 SHOPIFY - THE CASE YOUR WINDOW DECISION LEAVES OPEN', group:'after',
   brief:'The window will always miss someone. This attack adds the decision about what happens after it - defaulted to nothing.',
   attack: async function(){
    LEVELS[4].group = (K.ret==='ever') ? 'ret' : 'after';
    if (K.ret==='ever'){
     say('ATTACK 5','Months pass. A caller mints a fresh key that <b>collides with an ancient one</b> - your store never forgot it.');
     await animOldKeyReplay();
     card('bad','AN ANCIENT KEY ATE A NEW CHARGE','The new charge silently never happened - the store recognized a key from another era and replayed history. A window with no edge makes every old key a landmine.','AWS 2021: keep tokens too long and a future key can collide with an ancient one.','ret');
     say('ATTACK 5','No decision prevents stragglers AND collisions at once. <b>Bound the window</b> (WINDOW is glowing), then re-run - and watch what bounding it trades away.');
     return;
    }
    say('ATTACK 5','The clock spins past your window. The memory has legitimately forgotten - on schedule. A new row just appeared: what happens AFTER the window? It defaults to nothing.');
    ROWS_ADDED.after = true; if(!K.after) K.after='nothing'; paintDeck();
    var hand=document.getElementById('clockhand'); if(hand){ hand.style.transition='transform 1.2s'; hand.style.transformOrigin=G.clock.cx+'px '+G.clock.cy+'px'; hand.style.transform='rotate(1000deg)'; }
    await sleep(1250);
    await animLateKey(false);
    say('ATTACK 5','A straggler outlived the window and charged twice. No decision prevents this one - the question is whether anyone ever finds out.');
   },
   rerun: async function(){
    if (K.ret==='ever'){
     await animOldKeyReplay();
     card('bad','STILL COLLIDING','The store still never forgets, so ancient keys still eat new charges. Bound the window first - WINDOW is the decision.','AWS 2021.','ret');
     return { held:false };
    }
    if (!ROWS_ADDED.after){
     ROWS_ADDED.after = true; if(!K.after) K.after='nothing'; LEVELS[4].group='after'; paintDeck();
     say('ATTACK 5','Your window has an edge now - so a new decision exists: what happens AFTER it? It defaults to nothing. Watch what the edge costs\u2026');
     var hand=document.getElementById('clockhand'); if(hand){ hand.style.transition='transform 1.2s'; hand.style.transformOrigin=G.clock.cx+'px '+G.clock.cy+'px'; hand.style.transform='rotate(1000deg)'; }
     await sleep(1250);
     await animLateKey(false);
     card('bad','YOU TRADED THE COLLISION FOR A STRAGGLER','Bounding the window ended the collisions - and created the case the window misses. A straggler charged twice, and nobody was looking. Decide what happens after the window, then re-run.','Shopify 2022.','after');
     return { held:false };
    }
    await animLateKey(false);
    if (K.after==='reconcile'){
     await animReconcileSweep();
     dayDamage = dayTokens(K); renderBill(dayDamage.bill);
     card('good','HELD - CAUGHT, RECORDED, REPAIRED','The straggler still charged twice - the fix is detection, not prevention. The sweep compared your record against the partner\'s, logged the mismatch as an anomaly, and repaired it. Reconciliation joins your bill as a standing team cost.','Shopify 2022: the standing admission that prevention is never complete.',null);
     return { held:true };
    }
    card('bad','BROKE - THE DOUBLE CHARGE WAS NEVER FOUND','Nobody compared the records. The merchant\'s accountant finds it in three months, as a chargeback.','Shopify 2022: verify the money afterward - your records against the partner\'s, every mismatch logged.','after');
    return { held:false };
   },
   hints:[
    ['keep keys forever, so nothing is ever forgotten','Then nothing straggles - and every key ever seen becomes a landmine for a future collision. If you arrived here with forever on, you watched exactly that.'],
    ['a reconciliation sweep against the partner\'s records','Shopify\'s posture - the new row has this option. Note what it does NOT do: prevent.'],
    ['reject retries older than the window with an error','The hour-30 client cannot tell that error from a fresh failure - the ambiguity is back for exactly the case the window missed.'] ] }
 ];

 function escEnter(i){
  escMode = i; curLvl = i+1;
  paintDeck(); $('#artB').dataset.cue = LEVELS[i].group ? 'group' : '';
  var lvlEl = $$('#lvls .lvl')[i];
  lvlEl.querySelector('.fixrow').style.display='';
  say('YOUR MOVE', LEVELS[i].group ? 'Fix it with your decisions - the group that matters is glowing - then <b>re-run the attack</b>. Hints are under the level if you want them.' : 'Try any change you like, then <b>re-run the attack</b>.');
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
   escWatched[i]=true; curLvl=i+1; layerAnim = el('g',{}); await LEVELS[i].attack();
   lock(false); running=false;
   escEnter(i);
  });});
  $$('#lvls .rerunbtn').forEach(function(b){ b.addEventListener('click', async function(){
   var i=+b.dataset.lvl;
   if (running || escMode!==i) return;
   running=true; lock(true);
   curLvl=i+1; layerAnim = el('g',{}); drawStage(); layerAnim = el('g',{});
   var res = await LEVELS[i].rerun();
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
  var html='<span class="dt">HELD UNDER ATTACK - THE DEBRIEF</span><br><br>Your final design, decision by decision:<br><br>';
  html+=drow('IDENTITY','the caller names each operation with a key',
   'Stripe 2017, Airbnb 2019 and AWS 2021 state it outright. Segment 2017 mints it in the SDK because its callers can\'t cooperate. Shopify\'s post doesn\'t say who generates it.');
  if (K.mem==='acid') html+=drow('MEMORY','committed with the work - one transaction',
   'AWS 2021: the half-failures aren\'t allowed to exist. The price is on your bill: the work must live in the same database as its record, so nothing that crosses to an external partner can sit inside the commit. The other clean shape - a separate store plus recovery steps - is Shopify\'s, and pays in recovery code instead.');
  else html+=drow('MEMORY','a separate store, plus recovery steps that rebuild state',
   'Shopify 2022; Airbnb 2019 in spirit, with three all-or-nothing phases. The price is on your bill: recovery code per step. The other clean shape - one commit - is AWS\'s, and pays by keeping the work inside one database, away from external partners.');
  html+=drow('READS','the master - where the record was written',
   'Airbnb 2019 is the post that states it, and it is the baseline every safe design pays. Airbnb paid it by splitting the key tables across machines, by key.');
  if (K.rep==='saved') html+=drow('REPLY','a duplicate gets the saved result',
   'Stripe 2017 and Airbnb 2019; AWS 2021 sharpens it to a same-meaning success. The price is on your bill: results stored for every operation, a table that grows with traffic. The alternative - an error - moves that price into every caller\'s code. Segment answers with silence; none of these map to it, because its callers can\'t use the information.');
  else html+=drow('REPLY','a duplicate gets "error: already processed"',
   'None of the five ship this as the design - AWS 2021 argues it is exactly what makes retry-by-default hard to offer. The price is on your bill: every caller writes branching code. The alternative - replay the saved result - is Stripe/Airbnb\'s, and pays in stored results instead.');
  if (K.ret==='day') html+=drow('WINDOW','~24 hours, chosen on purpose',
   'Shopify 2022. Price: stragglers after the window. Segment\'s alternative bounds by size and shrinks under load; forever is the option none of the five chose.');
  else if (K.ret==='size') html+=drow('WINDOW','bounded by size - evict oldest, page under 24h',
   'Segment 2017. Prices: stragglers, plus a window that shrinks under load. "Almost exactly once" is the honest name.');
  else html+=drow('WINDOW','forever',
   'None of the five kept keys without bound - AWS 2021 warns a future key can collide with an ancient one. It held the load attack by paying in storage.');
  if (K.params) html+= (K.params==='refuse'
   ? drow('SAME KEY, NEW PARAMS','refuse, naming the mismatch','AWS 2021 - the stored parameters exist precisely so the collision can be caught. The guarantee protects intent.')
   : drow('SAME KEY, NEW PARAMS', K.params==='run'?'run it':'replay the old result','None of the five - and the attack showed why.'));
  if (K.after) html+= (K.after==='reconcile'
   ? drow('AFTER THE WINDOW','a reconciliation sweep against the partner\'s records','Shopify 2022 - verify the money afterward, log every mismatch as an anomaly. Detection, not prevention; a standing team cost, on your bill.')
   : drow('AFTER THE WINDOW','nothing','None of the five ship this - the straggler is real, and someone else finds it.'));
  html+='<b>THE BILL, IN FULL:</b><br>'+bill.map(function(b){ return '\u2022 '+b.c+' <span style="color:#6B7280;">('+b.s+')</span>'; }).join('<br>')+'<br><br>';
  html+='Same guarantee, different price. <b>That trade is the interview answer.</b>';
  d.innerHTML=html;
 }
 function debrief(){ buildDebrief(); }

 $('#runbtn').addEventListener('click', runAll);
 $('#stepbtn').addEventListener('click', stepOne);
 $('#fastbtn').addEventListener('click', function(){ userChoseSpeed = true; speed = speed===1?2.2:1; $('#fastbtn').classList.toggle('on', speed>1); $('#fastbtn').textContent = speed>1 ? '1\u00D7' : '2\u00D7'; });
 $('#resetbtn').addEventListener('click', function(){
 if (running) return;
 K={ id:'none', mem:'none', read:'master', cli:'blind', rep:'err', ret:'day' }; ROWS_ADDED={params:false,after:false}; delete K.params; delete K.after;
 won=false; lvlDone=[false,false,false,false,false]; evIdx=0; escMode=-1; curLvl=0; escWatched=[false,false,false,false,false]; l1Tried=false; runsDone=0;
 var rb=$('#runbtn'); rb.innerHTML='RUN THE DAY - NAIVE ▶'; $('#artB').dataset.cue='run';
 $('#escwrap').style.display='none'; $('#debrief').className='debrief'; var bp=$('#bill'); if(bp) bp.style.display='none';
 freshDay(); paintDeck(); say('READY','Naive decisions restored. Run the day.');
 });

 chips(); drawStage(); paintDeck();
 if (REDUCED){ $('#stepbtn').style.borderColor='#D946EF'; $('#stepbtn').style.color='#E879F9'; say('READY','Reduced motion is on - STEP plays the day one event at a time. Your decisions start naive on purpose: <b>the damage report is the syllabus.</b>'); }
 else say('READY','Your decisions start naive on purpose. RUN the day as-is first: <b>the damage report is the syllabus.</b>');
}

// ---- the host bridge (this port) -----------------------------------------
function bootBridge() {
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
   if (!tag){ tag = document.createElement('span'); tag.className='addtag'; tag.textContent=t[2]; lbl.appendChild(tag); }
  });
 }

 /* ---- R4: phone damage toast - clones each new failure card's first line (v7.3 script) ---- */
 var toast = $('#dmgtoast'), toastT = null;
 if (toast){
  toast.addEventListener('click', function(){
   var log=$('#log'); if(!log) return;
   window.scrollTo({ top: log.getBoundingClientRect().top + window.pageYOffset - 70, behavior:'smooth' });
   toast.classList.remove('on');
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
 observe($('#log'), function(ms){
  if (!toast || window.innerWidth >= 700) return;
  ms.forEach(function(m){
   if (!m.addedNodes.length) return;
   var c = m.addedNodes[0];
   if (!c.classList || !c.classList.contains('bcard') || !(c.classList.contains('bad')||c.classList.contains('warn'))) return;
   var code = c.querySelector('.code');
   toast.textContent = (code ? code.textContent : 'damage') + ' - tap for the report';
   toast.classList.add('on');
   clearTimeout(toastT); toastT = setTimeout(function(){ toast.classList.remove('on'); }, 4000);
  });
 }, { childList:true });
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
  bootEngine();
  return bootBridge();
 }, []);
 return (
  <>
   <style>{CSS}</style>
   <div dangerouslySetInnerHTML={{ __html: MARKUP }} />
  </>
 );
}
