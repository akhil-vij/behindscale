import { useEffect } from 'react'

// Problem-level artifact - "Two ways a queue breaks" (try-it), for
// /problems/queue-backlog. Ported from the v1.3 prototype (queue-backlog-v1.3:
// tryit.js for the script and its verdict strings, build.py for the markup and
// its labels, the JSON for the eyebrow, title, sub line and foot), the same
// way page 1's try-it was ported: this React shell renders the markup once and
// boots the vanilla script in an effect.
//
// The look is page 1's try-it (its CSS block, unchanged apart from the stage
// switch below): the prototype's own layout is not ported. The script is the
// prototype's, with two sanctioned edits:
//   - the stage parts (the queue's bar and label, the stuck-job mark, the
//     workers' box) are found by data-part, not id, so a horizontal and a
//     vertical copy of the stage can both be driven (the design drop-in);
//   - the 150ms tick is cleared on unmount.
// The tick is a live counter of a running queue, not travel, so it runs the
// same under reduced motion.
//
// Host protocol (v1, see src/pages/ProblemDetail.tsx): this artifact posts
// {v:1, wall, type:'size', h} so the host can size the frame to its content.
// Standalone, the shell's bar links back to the page (scripts/compile-artifacts.ts).

const WALL = 'buffer-degrades-under-backlog'

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
.stagewrap { margin-top: 12px; position: relative; }
svg.stage { width: 100%; height: auto; display: block; }
/* §3b (F12): the horizontal wire (640x138) shows at >=700px; the vertical TV
   wire (360x300) shows under 700px, where it fits with legible labels. The
   hidden one is display:none -- so no duplicate visible ids, and the engine
   toggles cutlab across both by id-prefix. This retires the Batch-2 scroll
   pill + horizontal min-width for phones. */
svg.stage:not(.stage-v) { min-width: 480px; }
svg.stage.stage-v { display: none; } /* outrank svg.stage{display:block} (§3b) */
@media (max-width: 700px) {
 .stagewrap { overflow-x: visible; }
 svg.stage:not(.stage-v) { display: none; }
 svg.stage.stage-v { display: block; min-width: 0; }
}
/* the phone stage's labels at 14 / 13 units (11.1px and up at a 308px frame) */
svg.stage.stage-v .s-nlabel { font-size: 14px; }
svg.stage.stage-v .s-nsub { font-size: 13px; }
@media (min-width: 701px) { .stagewrap { overflow-x: auto; } }
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
 <div class="art-eyebrow">WALL · BUFFER DEGRADES UNDER BACKLOG · INTERACTIVE</div>
 <div class="art-title">Two ways a queue breaks <span style="font-size:9px;letter-spacing:1.5px;border:1px solid #6B7280;color:#6B7280;border-radius:5px;padding:2px 7px;vertical-align:2px;font-weight:400;">TRY IT</span></div>
 <p class="art-sub">Fourteen jobs a second arrive. Two things can go wrong: the workers slow down, or one job gets stuck. Where the backlog lives decides what happens next.</p>
 <div class="stagewrap"><svg class="stage" viewBox="0 0 640 138" role="img" aria-label="Senders send jobs into a queue, and workers deliver them to a partner. The bar in the queue fills as the backlog grows.">
  <rect class="s-node" x="8" y="46" width="104" height="34" rx="7"/>
  <text class="s-nlabel" x="60" y="67">SENDERS</text>
  <line class="s-seg" x1="120" y1="63" x2="196" y2="63"/>
  <rect class="s-node" x="202" y="30" width="176" height="74" rx="7"/>
  <text class="s-nlabel" x="290" y="48">THE QUEUE</text>
  <rect x="225" y="56" width="130" height="14" rx="4" fill="#161922" stroke="#3a4158"/>
  <rect data-part="buf" x="225" y="56" width="10" height="14" rx="4" fill="#3b82f6"/>
  <text class="s-nsub" x="290" y="90" data-part="bufl"></text>
  <g data-part="stuckmark" style="display:none"><circle cx="349" cy="63" r="6" fill="#ef4444"></circle><text x="349" y="66.5" text-anchor="middle" font-size="9" font-weight="700" fill="#08090D">!</text></g>
  <line class="s-seg" x1="384" y1="63" x2="424" y2="63"/>
  <rect class="s-node" data-part="drainbox" x="430" y="46" width="70" height="34" rx="7"/>
  <text class="s-nlabel" x="465" y="67">WORKERS</text>
  <line class="s-seg" x1="506" y1="63" x2="522" y2="63"/>
  <rect class="s-node" x="528" y="46" width="104" height="34" rx="7"/>
  <text class="s-nlabel" x="580" y="67">PARTNER</text>
 </svg>
 <svg class="stage stage-v" viewBox="0 0 360 300" role="img" aria-label="Senders send jobs into a queue, and workers deliver them to a partner. The bar in the queue fills as the backlog grows.">
  <rect class="s-node" x="90" y="10" width="180" height="44" rx="7"/>
  <text class="s-nlabel" x="180" y="36">SENDERS</text>
  <line class="s-seg" x1="180" y1="54" x2="180" y2="78"/>
  <rect class="s-node" x="90" y="78" width="180" height="78" rx="7"/>
  <text class="s-nlabel" x="180" y="98">THE QUEUE</text>
  <rect x="115" y="108" width="130" height="16" rx="4" fill="#161922" stroke="#3a4158"/>
  <rect data-part="buf" x="115" y="108" width="10" height="16" rx="4" fill="#3b82f6"/>
  <text class="s-nsub" x="180" y="146" data-part="bufl"></text>
  <g data-part="stuckmark" style="display:none"><circle cx="239" cy="116" r="6" fill="#ef4444"></circle><text x="239" y="119.5" text-anchor="middle" font-size="9" font-weight="700" fill="#08090D">!</text></g>
  <line class="s-seg" x1="180" y1="156" x2="180" y2="180"/>
  <rect class="s-node" data-part="drainbox" x="90" y="180" width="180" height="44" rx="7"/>
  <text class="s-nlabel" x="180" y="206">WORKERS</text>
  <line class="s-seg" x1="180" y1="224" x2="180" y2="248"/>
  <rect class="s-node" x="90" y="248" width="180" height="44" rx="7"/>
  <text class="s-nlabel" x="180" y="274">PARTNER</text>
</svg></div>
 <div class="art-cols">
  <div class="art-panel art-controls">
   <span class="art-label">WHERE THE BACKLOG LIVES</span>
   <button class="abtn sel" data-sub="mem">IN MEMORY<small>fast, but emptying it needs free memory too</small></button>
   <button class="abtn" data-sub="log">ON DISK, IN A LOG<small>written in order, one worker per line</small></button>
   <button class="abtn" data-sub="rows">ROWS IN A DATABASE<small>one row per job, and the order is a query</small></button>
   <span class="art-label gap">BREAK SOMETHING</span>
   <button class="abtn cut" id="t-slow">&#9986; THE WORKERS SLOW TO A FIFTH<small>the database they write to is overloaded</small></button>
   <button class="abtn cut" id="t-stuck">&#9986; ONE JOB GETS STUCK<small>a job that can never succeed</small></button>
   <button class="abtn" id="treset" style="margin-top:12px;">&#8634; RESET</button>
  </div>
  <div class="art-right">
   <div class="averdict on" id="taverdict"><div class="code" id="tvcode"></div><div class="vbody" id="tvbody"></div></div>
   <div class="art-panel"><span class="art-label">WHAT THE SENDERS CAN'T SEE</span>
    <div class="art-meters">
     <div class="art-meter"><span class="art-label">DRAIN RATE</span><div class="val" id="tdrain">0/s</div></div>
     <div class="art-meter"><span class="art-label">JOBS LOST</span><div class="val good" id="tlost">0</div></div>
     <div class="art-meter"><span class="art-label">WAITING BEHIND THE STUCK JOB</span><div class="val" id="twait">0</div></div>
    </div></div>
  </div>
 </div>
 <div class="art-foot">The memory queue that locks up when full is Slack&#x27;s. The line that one stuck job holds up is Uber&#x27;s. The rows whose order is a query are Segment&#x27;s. Rows that stay fast to read as the backlog grows are Meta&#x27;s, thanks to checkpoints. The rates and the memory size are made up for the demo. The ways it fails come from the posts.</div>
`

function bootEngine() {
 var $=function(s){return document.querySelector(s);}, $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};
 var part=function(n){return $$('#tryit-root [data-part="'+n+'"]');};
 var sub='mem', slow=false, stuck=false, t=0, timer=null;
 var W={backlog:6, drain:0, lost:0, waiting:0, seized:false, frozen:false};
 var CAP=100, ARR=14, DT=0.15;
 function fresh(){ W={backlog:6, drain:0, lost:0, waiting:0, seized:false, frozen:false}; t=0; }
 function step(){
  t+=DT;
  var arr=ARR*DT;
  var cap=(slow?5:32)*DT;
  if (sub==='mem'){
   if (W.seized){ W.lost+=arr; W.drain=0; }
   else {
    W.backlog=Math.min(CAP,W.backlog+arr);
    var eff=Math.max(0.2,1-(W.backlog/CAP)*0.8);        /* dequeue cost grows with length */
    var d=Math.min(W.backlog,cap*eff); W.backlog-=d; W.drain=d/DT;
    if (W.backlog>=CAP-0.5) W.seized=true;                /* full: no memory to dequeue */
   }
  } else if (sub==='log'){
   W.backlog+=arr;                                        /* durable: accepts at line rate */
   if (stuck){ W.frozen=true; W.drain=0; W.waiting=W.backlog; } /* one lane, one worker, head blocks */
   else { W.frozen=false; var d2=Math.min(W.backlog,cap); W.backlog-=d2; W.drain=d2/DT; W.waiting=0; }
  } else { /* rows */
   W.backlog+=arr;
   var d3=Math.min(W.backlog,cap); W.backlog-=d3; W.drain=d3/DT;
   W.waiting=stuck?1:0;                                   /* the stuck row waits alone */
   W.frozen=false;
  }
  render();
 }
 function verdict(){
  var pct=Math.round(Math.min(100,W.backlog/CAP*100));
  if (sub==='mem'){
   if (W.seized) return slow? ['red','LOCKED: A FULL QUEUE CAN\'T EMPTY ITSELF','Taking a job out needs a little free memory to move it aside, and the backlog has used it all. Senders are getting errors. Now fix the slowdown and watch: it stays locked. This is Slack in 2017.']
                            : ['red','THE SLOWDOWN IS FIXED, AND THE QUEUE IS STILL LOCKED','The cause is gone, but the queue stays locked, because emptying it needs the memory the backlog used up. Slack had to recover it by hand. Reset, and try keeping the backlog somewhere else.'];
   if (slow) return [pct>70?'red':'amber','MEMORY FILLING: '+pct+'%, AND THE DRAIN IS SLOWING','Two things go wrong at once: each job takes longer to take out as the queue gets longer, and memory is running out. The fuller it gets, the less able it is to recover.'];
   if (stuck) return ['amber','ONE STUCK JOB: THE MEMORY QUEUE KEEPS MOVING','A worker keeps retrying the stuck job while the others take the rest. The stuck-job shape of the wall doesn\'t bite here. Try the slowdown instead. That shape does.'];
   return ['amber','A QUEUE IN MEMORY: FAST, BUT EMPTYING IT NEEDS FREE MEMORY','Senders on the left, workers on the right, the backlog in between. Slow the workers down and watch what the backlog does to the queue itself.'];
  }
  if (sub==='log'){
   if (stuck) return ['red','ONE STUCK JOB: EVERYTHING BEHIND IT WAITS ('+Math.round(W.waiting)+')','One line, one worker, and each job must finish before the next starts. A healthy job waits behind a broken one, forever. This is called head-of-line blocking. This is Uber in 2021.'];
   if (slow) return ['green','SLOW DRAIN: THE BACKLOG IS JUST A NUMBER ON DISK','The log takes every job as fast as it arrives. Nothing is lost and nothing locks up. The backlog is '+Math.round(W.backlog)+' and climbing: a delay, not an outage. Now get one job stuck.'];
   return ['amber','A LOG ON DISK: ONE LINE, IN ORDER','Every job is written to disk first, then read out in order by one worker per line. Slow the workers down, then get one job stuck.'];
  }
  if (stuck) return ['green','ONE STUCK ROW: IT WAITS ALONE','Each job is a row, and the order of delivery is a query, so the stuck job no longer sits in front of the others. The line keeps moving. This is Segment in 2018. What it costs is the next question.'];
  if (slow) return ['green','SLOW DRAIN: ROWS PILE UP, THE DRAIN STAYS FLAT','The database only ever works on a few jobs at a time, and rows are added, never rewritten, so the drain doesn\'t slow as the backlog grows. Meta keeps its reads fast with checkpoints. Segment replaces whole databases every 30 minutes.'];
  return ['amber','ROWS IN A DATABASE: THE ORDER IS A QUERY','Every job is a row. Nothing is in front of anything until a query says so. Break it both ways.'];
 }
 function render(){
  $$('.abtn[data-sub]').forEach(function(b){b.classList.toggle('sel',b.dataset.sub===sub);});
  $('#t-slow').classList.toggle('sel',slow); $('#t-stuck').classList.toggle('sel',stuck);
  var v=verdict(), el=$('#taverdict'); el.className='averdict on v-'+v[0]; $('#tvcode').textContent=v[1]; $('#tvbody').textContent=v[2];
  var pct=Math.min(100,W.backlog/CAP*100);
  part('buf').forEach(function(bar){ bar.setAttribute('width',Math.max(0,pct*1.3)); bar.setAttribute('fill', W.seized||W.frozen?'#ef4444': pct>70?'#eab308':'#3b82f6'); });
  part('bufl').forEach(function(t){ t.textContent=(sub==='mem'?'MEMORY':sub==='log'?'LOG ON DISK':'DATABASE ROWS')+' · '+Math.round(W.backlog)+(sub==='mem'?' / '+CAP:''); });
  $('#tdrain').textContent=W.drain.toFixed(0)+'/s'; $('#tdrain').className='val '+(W.drain<8?(slow||stuck?'bad':''):'good');
  $('#tlost').textContent=Math.round(W.lost); $('#tlost').className='val '+(W.lost>0?'bad':'good');
  $('#twait').textContent=Math.round(W.waiting); $('#twait').className='val '+(W.waiting>5?'bad':'');
  part('stuckmark').forEach(function(g){ g.style.display=stuck?'':'none'; });
  part('drainbox').forEach(function(r){ r.style.stroke = slow?'var(--art-red)':''; }); /* style: .s-node outranks a stroke attribute */
 }
 $$('.abtn[data-sub]').forEach(function(b){ b.addEventListener('click',function(){ sub=b.dataset.sub; fresh(); render(); }); });
 $('#t-slow').addEventListener('click',function(){ slow=!slow; render(); });
 $('#t-stuck').addEventListener('click',function(){ stuck=!stuck; render(); });
 $('#treset').addEventListener('click',function(){ fresh(); slow=false; stuck=false; render(); });
 timer=setInterval(step,150); render();
 return function(){ clearInterval(timer); };
}

function bootBridge() {
 var root = document.querySelector('#tryit-root .artifact');
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

export default function ProblemQueueBacklogTryIt() {
 useEffect(function () {
  var stopEngine = bootEngine();
  var stopBridge = bootBridge();
  return function () { stopEngine(); stopBridge(); };
 }, []);
 return (
  <>
   <style>{CSS}</style>
   <div id="tryit-root" dangerouslySetInnerHTML={{ __html: MARKUP }} />
  </>
 );
}
