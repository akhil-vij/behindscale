/* BUILD IT: "Own the queue". Prototype v1.2 for the queue-backlog wall (copy pass applied).
 Same contract as ambiguous-timeouts v7.3: events produce FAILURES, decisions produce THE BILL,
 every bill line names the company that named the price; attacks flip or add a decision and are
 fixed with the decisions panel; one data-cue attribute; generated debrief. Different genre:
 continuous dials - the day is six phases of a running simulation, not six discrete requests. */
(function(){
 'use strict';
 var $=function(s){return document.querySelector(s);}, $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};
 var NS='http://www.w3.org/2000/svg';
 var NAIVE={ where:'mem', full:'accept', stuck:'block', order:'fifo', done:'fetch', retry:'forever' };
 var K=Object.assign({},NAIVE);
 var ROWS_ADDED={ dedupe:false, retention:false, scans:false, archive:false };
 var FREE=/[?&]free\b/.test(location.search);
 var speed=1,userChoseSpeed=false,curEv=-1,running=false,won=false,evIdx=0,dayDamage=null,runsDone=0;
 var REDUCED=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var lvlDone=[false,false,false,false,false];
 var escMode=-1,curLvl=0,l1Tried=false;

 /*RULES-START*/
 function dayTokens(Q){
  var durable=(Q.where!=='mem');
  var spill=(Q.full==='relay');
  var ev=[];
  ev.push({e:'routine',t:'CLEAN'});
  /* E2 downstream slowdown: the buffer fills */
  ev.push({e:'slowdown',t: spill?'CLEAN_SPILL': Q.full==='reject'?'REJECTED': Q.full==='throttle'?'UPSTREAM': durable?'CLEAN_DELAY':'SEIZED'});
  /* E3 poison pill: one item that can never be processed */
  ev.push({e:'poison',t: Q.stuck==='block'?'HOL_STALL': Q.stuck==='requeue'?(Q.retry==='forever'?'CLEAN_REQUEUE_LOOP':'CLEAN_REQUEUE'): Q.stuck==='ackaround'?'CLEAN_DLQ':'CLEAN_LOCALQ'});
  /* E4 whale tenant: one producer sends 50,000 in a burst */
  ev.push({e:'whale',t: Q.order==='tenant'?'CLEAN_ISOLATED': Q.order==='priority'?'STALL_SAME_PRIORITY':'TENANT_STALL'});
  /* E5 consumer crash mid-item */
  ev.push({e:'crash',t: Q.done==='fetch'?'LOST_ITEM':'CLEAN_REDELIVER'});
  /* E6 partner outage, then recovery */
  ev.push({e:'partner',t: Q.retry==='forever'?'STORM': Q.retry==='backoff'?'CLEAN_BACKOFF':'CLEAN_CUTOFF'});
  var lost=0,stalled=0,outage=0;
  ev.forEach(function(x){
   if(/^(REJECTED|LOST_ITEM)$/.test(x.t)) lost++;
   if(/^(HOL_STALL|TENANT_STALL|STALL_SAME_PRIORITY)$/.test(x.t)) stalled++;
   if(/^(SEIZED|UPSTREAM|STORM)$/.test(x.t)) outage++;
  });
  var bill=[];
  bill.push({c:'a queue between arriving work and slower workers is one more system to run and to reason about. Every design pays this',s:'Slack 2017, DoorDash 2020',base:true});
  if(spill) bill.push({c:'a queue on disk in front and a rate-limited relay behind it: two queueing systems, and someone has to choose the drain rate',s:'Slack 2017'});
  if(!spill&&durable&&Q.full==='accept') bill.push({c:'delay is the product: a backlog is normal, and everything downstream has to live with the delay',s:'Meta 2021'});
  if(Q.where==='rows') bill.push({c:'a fleet of databases run as throwaway machines, with spares, replacements and drainers',s:'Segment 2018'});
  if(Q.where==='log') bill.push({c:'storage that grows with the backlog, up to the limit on how long jobs are kept',s:'Slack 2017'});
  if(Q.stuck==='ackaround') bill.push({c:'a dead-letter queue a person has to empty. It sets jobs aside without fixing them',s:'Uber 2021'});
  if(Q.stuck==='localq') bill.push({c:'a small loss window: the local queue\'s cap limits what a crash can lose',s:'DoorDash 2020'});
  if(Q.stuck==='requeue'&&Q.retry==='forever') bill.push({c:'a stuck job circles forever, using up the workers on every lap',s:'what this mission showed'});
  if(Q.order==='tenant') bill.push({c:'the separation between customers lives in the scheduling code, not in separate machines, so that code has to be right',s:'our note on Segment 2018'});
  if(Q.order==='priority') bill.push({c:'ordering by priority across many databases needs machinery running in the background',s:'Meta 2021'});
  if(Q.done==='lease'||Q.done==='watermark') bill.push({c:'every worker has to cope with repeats (idempotency): a slow worker looks like a dead one, and its job arrives twice',s:'Meta 2021, Uber 2021'});
  if(Q.done==='watermark') bill.push({c:'progress lives in two places: jobs confirmed but not yet under the marker come back after a reshuffle',s:'Uber 2021'});
  if(Q.retry==='backoff') bill.push({c:'jobs arrive late, and the partner still takes a burst before the growing waits spread it out',s:'Segment 2018'});
  if(Q.retry==='cutoff') bill.push({c:'some jobs are never delivered: they are archived once they pass the cutoff',s:'Segment 2018'});
  if(Q.dedupe==='yes') bill.push({c:'spotting repeats downstream has to keep working, forever',s:'Uber 2021'});
  if(Q.retention==='7d') bill.push({c:'a week of backlog on disk: storage sized for the bad week, not the normal day',s:'Slack 2017 kept two days'});
  if(Q.retention==='unbounded') bill.push({c:'no limit on how long jobs are kept: now the disk is what fills up',s:'Slack 2017 kept two days'});
  if(Q.scans==='checkpoint') bill.push({c:'a checkpoint limit kept up by discipline, inside someone else\'s database',s:'Meta 2021'});
  if(Q.archive==='replay') bill.push({c:'replay tools, and a person deciding about every archived batch',s:'Segment 2018, Uber 2021'});
  return {ev:ev,lost:lost,stalled:stalled,outage:outage,bill:bill,win:(lost===0&&stalled===0&&outage===0)};
 }
 /*RULES-END*/

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
  var h='<div class="deck-title">YOUR DECISIONS</div><div class="deck-sub">the day runs with whatever it says here</div>';
  GROUPS.forEach(function(g){
   var ok=!g.needs||g.needs(); if(!ok&&g.hideLocked) return;
   h+='<div class="kg" id="kg-'+g.k+'"><div class="kgl">'+g.label+(g.q?' <span class="q">'+g.q+'</span>':'')+'</div><div class="seg">';
   g.opts.forEach(function(o){
    var dis=!ok||(g.optNeeds&&g.optNeeds[o[0]]&&!g.optNeeds[o[0]]());
    h+='<button data-k="'+g.k+'" data-v="'+o[0]+'" '+(dis?'disabled':'')+' class="'+(K[g.k]===o[0]?'sel':'')+'">'+o[1]+'</button>';
   });
   h+='</div></div>';
  });
  $('#deck').innerHTML=h;
  if(escMode>=0&&LEVELS[escMode]&&LEVELS[escMode].group){var gk=document.getElementById('kg-'+LEVELS[escMode].group); if(gk) gk.classList.add('cue-target');}
  $$('#deck button').forEach(function(b){ b.addEventListener('click',function(){
   if(running||b.disabled) return;
   if($('#artB').dataset.cue==='deck') setCue('');
   K[b.dataset.k]=b.dataset.v;
   if(K.done==='fetch'&&K.stuck==='ackaround') K.stuck='block';
   paintDeck(); drawStage();
   var sg=document.getElementById(STAGEMAP[b.dataset.k]); if(sg){sg.classList.remove('sflash'); void sg.getBoundingClientRect(); sg.classList.add('sflash');}
   var kg=document.getElementById('kg-'+b.dataset.k); if(kg){kg.classList.remove('flashg'); void kg.offsetWidth; kg.classList.add('flashg');}
  });});
 }
 function setCue(v){ $('#artB').setAttribute('data-cue',v); }

 /* ---------- stage: producers | buffer | drain | downstream ---------- */
 var stage=$('#bstage'), S;
 var GH={ prod:{x:16,y:70,w:120,h:150}, buf:{x:200,y:70,w:180,h:150}, drain:{x:430,y:96,w:80,h:100}, down:{x:544,y:96,w:88,h:100} };
 var GV={ prod:{x:20,y:14,w:320,h:90}, buf:{x:20,y:130,w:320,h:150}, drain:{x:20,y:306,w:150,h:90}, down:{x:190,y:306,w:150,h:90} };
 var VERT=false,G=GH;
 function el(name,attrs,parent,text){var e=document.createElementNS(NS,name);for(var k in attrs)e.setAttribute(k,attrs[k]);if(text!==undefined)e.textContent=text;(parent||stage).appendChild(e);return e;}
 var SIM={backlog:8,cap:100,drainCap:30,arr:14,waitA:0,waitB:0,waitC:0,partner:'up',spill:0};
 function drawStage(){
  stage.innerHTML=''; S=el('g',{});
  var P=G.prod,B=G.buf,D=G.drain,W=G.down;
  /* producers + tenant lanes */
  var gP=el('g',{id:'sg-order'},S);
  el('rect',{class:'nodebox',x:P.x,y:P.y,width:P.w,height:P.h,rx:8},gP);
  el('text',{class:'nlab',x:P.x+P.w/2,y:P.y+20},gP,'SENDERS');
  ['A','B','C'].forEach(function(t,i){
   var ly=VERT?P.y+40:P.y+44+i*32, lx=VERT?P.x+16+i*100:P.x+12;
   el('text',{class:'nsub',x:lx,y:ly,'text-anchor':'start'},gP,'customer '+t);
   el('rect',{id:'lane'+t,x:lx,y:ly+5,width:VERT?80:P.w-24,height:10,rx:3,fill:'#161922',stroke:'#1F2333'},gP);
   el('rect',{id:'lanefill'+t,x:lx,y:ly+5,width:0,height:10,rx:3,fill:'#6B7280'},gP);
   el('text',{id:'lanetxt'+t,class:'nsub',x:lx+(VERT?40:(P.w-24)/2),y:ly+30},gP, K.order==='tenant'?'own schedule':K.order==='priority'?'by priority':'one shared line');
  });
  /* wires */
  if(!VERT){ el('line',{class:'wire',x1:P.x+P.w,y1:145,x2:B.x,y2:145},S); el('line',{class:'wire',x1:B.x+B.w,y1:145,x2:D.x,y2:145},S); el('line',{class:'wire',x1:D.x+D.w,y1:145,x2:W.x,y2:145},S); }
  else { el('line',{class:'wire',x1:180,y1:P.y+P.h,x2:180,y2:B.y},S); el('line',{class:'wire',x1:95,y1:B.y+B.h,x2:95,y2:D.y},S); el('line',{class:'wire',x1:D.x+D.w,y1:D.y+45,x2:W.x,y2:W.y+45},S); }
  /* buffer */
  var gB=el('g',{id:'sg-buf'},S);
  el('rect',{class:'nodebox',id:'bufbox',x:B.x,y:B.y,width:B.w,height:B.h,rx:8},gB);
  el('text',{class:'nlab',x:B.x+B.w/2,y:B.y+20},gB,'THE QUEUE');
  el('text',{class:'nsub',x:B.x+B.w/2,y:B.y+36},gB,{mem:'in memory',log:'log on disk, one line per worker',rows:'rows in a database'}[K.where]);
  el('rect',{x:B.x+16,y:B.y+48,width:B.w-32,height:26,rx:5,fill:'#161922',stroke:'#3a4158'},gB);
  el('rect',{id:'bufill',x:B.x+16,y:B.y+48,width:0,height:26,rx:5,fill:'#3b82f6'},gB);
  el('text',{id:'buftxt',class:'nsub',x:B.x+B.w/2,y:B.y+66,fill:'#EDEFF3'},gB,'');
  var gF=el('g',{id:'sg-full'},S);
  el('text',{class:'nsub',x:B.x+B.w/2,y:B.y+92},gF,'when full: '+{accept:'keep accepting',reject:'refuse new jobs',throttle:'slow the senders',relay:'overflow to disk'}[K.full]);
  if(K.full==='relay'){ el('rect',{class:'ghostbox',x:B.x+16,y:B.y+100,width:B.w-32,height:22,rx:5},gF); el('text',{id:'spilltxt',class:'nsub',x:B.x+B.w/2,y:B.y+115},gF,'on disk: 0'); }
  var gS=el('g',{id:'sg-stuck'},S);
  el('text',{class:'nsub',x:B.x+B.w/2,y:B.y+138},gS,'stuck job: '+{block:'blocks the line',requeue:'back of the line',ackaround:'set aside',localq:'local queue'}[K.stuck]);
  el('g',{id:'poisonmark'},gS);
  /* drain */
  var gD=el('g',{id:'sg-done'},S);
  el('rect',{class:'nodebox',id:'drainbox',x:D.x,y:D.y,width:D.w,height:D.h,rx:8},gD);
  el('text',{class:'nlab',x:D.x+D.w/2,y:D.y+20},gD,'WORKERS');
  el('text',{id:'draintxt',class:'nsub',x:D.x+D.w/2,y:D.y+40},gD,'');
  el('text',{class:'nsub',x:D.x+D.w/2,y:D.y+60},gD,'done = '+{fetch:'handed out',lease:'confirmed, time limit',watermark:'confirmed, marker'}[K.done]);
  el('text',{id:'dupetxt',class:'nsub',x:D.x+D.w/2,y:D.y+78,fill:'#eab308'},gD,'');
  /* downstream */
  var gR=el('g',{id:'sg-retry'},S);
  el('rect',{class:'nodebox',id:'downbox',x:W.x,y:W.y,width:W.w,height:W.h,rx:8},gR);
  el('text',{class:'nlab',x:W.x+W.w/2,y:W.y+20},gR,'PARTNER');
  el('text',{id:'downtxt',class:'nsub',x:W.x+W.w/2,y:W.y+40},gR,'up');
  el('text',{class:'nsub',x:W.x+W.w/2,y:W.y+62},gR,'retries: '+{forever:'full speed',backoff:'wait longer',cutoff:'wait, then cut off'}[K.retry]);
  el('text',{id:'rpstxt',class:'nsub',x:W.x+W.w/2,y:W.y+80},gR,'');
  paintSim();
 }
 function paintSim(){
  var B=G.buf, pct=Math.min(1,SIM.backlog/SIM.cap);
  var f=document.getElementById('bufill'); if(f){ f.setAttribute('width',(B.w-32)*pct); f.setAttribute('fill', SIM.seized?'#ef4444': pct>0.7?'#eab308':'#3b82f6'); }
  var t=document.getElementById('buftxt'); if(t) t.textContent=(SIM.seized?'LOCKED · ':'')+Math.round(SIM.backlog)+(K.where==='mem'?' / '+SIM.cap:' waiting');
  var sp=document.getElementById('spilltxt'); if(sp) sp.textContent='on disk: '+Math.round(SIM.spill);
  var d=document.getElementById('draintxt'); if(d) d.textContent='draining '+Math.round(SIM.drainNow||0)+'/s';
  ['A','B','C'].forEach(function(x){ var lf=document.getElementById('lanefill'+x); if(!lf) return; var w=Math.min(1,(SIM['wait'+x]||0)/60); lf.setAttribute('width',(VERT?80:G.prod.w-24)*w); lf.setAttribute('fill', w>0.5?'#ef4444':'#6B7280'); });
  var dn=document.getElementById('downtxt'); if(dn){ dn.textContent=SIM.partner; dn.setAttribute('fill', SIM.partner==='up'?'#22c55e':'#ef4444'); }
  var rp=document.getElementById('rpstxt'); if(rp) rp.textContent=SIM.rps?('receiving '+Math.round(SIM.rps)+'/s'):'';
 }
 function pickG(){ VERT=window.innerWidth<700; G=VERT?GV:GH; stage.setAttribute('viewBox',VERT?'0 0 360 410':'0 0 648 240'); }
 pickG(); window.addEventListener('resize',function(){var v=window.innerWidth<700; if(v!==VERT&&!running){pickG();drawStage();}});

 function sleep(ms){ return new Promise(function(r){setTimeout(r,ms/speed);}); }
 function dwell(ms){ return new Promise(function(r){setTimeout(r,ms);}); } /* real time, never speed-divided */
 function say(tag,html){ $('#narr').innerHTML='<span class="tag">'+tag+'</span> · '+html; }
 function card(cls,code,body,src,knob){
  var d=document.createElement('div'); d.className='bcard '+cls;
  var q={where:'q1',full:'q3',stuck:'q4',order:'q5',done:'q6',retry:'q7',dedupe:'q6',retention:'q7',scans:'q2',archive:'q7'}[knob]||'q1';
  d.innerHTML='<span class="code">'+code+'</span><div>'+body+(knob?' <span class="kl" data-knob="'+knob+'">\u2192 the decision</span> \u00b7 <a class="khint" href="#'+q+'">hint \u2193</a>':'')+'</div>'+(src?'<div class="src">'+src+'</div>':'');
  $('#log').prepend(d);
  d.querySelectorAll('.kl').forEach(function(k){k.addEventListener('click',function(){var kg=document.getElementById('kg-'+k.dataset.knob); if(kg){ window.scrollTo({top:kg.getBoundingClientRect().top+window.pageYOffset-120,behavior:'smooth'}); kg.classList.remove('flashg'); void kg.offsetWidth; kg.classList.add('flashg'); }});});
 }
 /* run a sim phase: n ticks, each tick applies fn(SIM) then paints */
 async function phase(n,fn,ms){ for(var i=0;i<n;i++){ fn(SIM,i); paintSim(); await sleep(ms||130); } }
 function stamp(kind,txt){ var host=document.getElementById(kind); if(!host) return; host.textContent=txt; }
 function poison(on){ var g=document.getElementById('poisonmark'); if(!g) return; g.innerHTML=''; if(!on) return; var B=G.buf; el('circle',{cx:B.x+30,cy:B.y+61,r:7,fill:'#ef4444'},g); el('text',{x:B.x+30,y:B.y+65,'text-anchor':'middle','font-size':'9',fill:'#08090D','font-weight':'700'},g,'!'); }

 var EVMETA=[{chip:'1 · STEADY'},{chip:'2 · WORKERS SLOW'},{chip:'3 · STUCK JOB'},{chip:'4 · BIG CUSTOMER'},{chip:'5 · WORKER CRASH'},{chip:'6 · PARTNER DOWN'}];
 var EVENTS=[
  async function routine(){
   say('EVENT 1/6','Steady traffic. Fourteen jobs a second arrive, and the workers can do thirty. The queue barely notices it is there.');
   await phase(12,function(s){ s.backlog=Math.max(2,s.backlog+14*0.15-30*0.15); s.drainNow=Math.min(30,14+s.backlog); });
   return {cls:'good'};
  },
  async function slowdown(t){
   say('EVENT 2/6','<b>The workers slow to a fifth of their speed</b>, because the database behind them is overloaded. Jobs keep arriving at the same rate. Watch the queue.');
   var d=document.getElementById('drainbox'); if(d) d.setAttribute('stroke','#ef4444');
   if(t==='SEIZED'){
    await phase(22,function(s){ var eff=Math.max(0.2,1-(s.backlog/s.cap)*0.8); var dr=6*0.15*eff; s.backlog=Math.min(s.cap,s.backlog+14*0.15-dr); s.drainNow=dr/0.15; if(s.backlog>=s.cap-0.5){s.seized=true;s.drainNow=0;} });
    await dwell(900);
    say('EVENT 2/6','Full. And <b>a full queue can\'t empty itself</b>: taking a job out needs a little free memory, and the backlog has used it all. Watch: the slowdown ends, and the queue stays locked.');
    await phase(8,function(s){ s.drainNow=0; }); if(d) d.setAttribute('stroke','#3a4158'); await phase(6,function(s){ s.drainNow=0; });
    card('bad','LOCKED: THE QUEUE TOOK THE SITE DOWN','The queue (Redis) filled its memory, and taking a job out needed free memory. Every feature that depends on the queue failed. The slowdown was fixed and the queue stayed locked. Getting it back took a lot of manual work.','Slack 2017.','where');
    SIM.seized=false; SIM.backlog=8; return {cls:'bad'};
   }
   if(t==='REJECTED'){
    await phase(16,function(s){ s.backlog=Math.min(s.cap,s.backlog+14*0.15-6*0.15); s.drainNow=6; });
    await dwell(900);
    say('EVENT 2/6','Full, and now the queue <b>turns senders away</b>. Every job that arrives is an error someone upstream has to handle.');
    await phase(8,function(s){ s.drainNow=6; s.rejected=(s.rejected||0)+2; });
    card('bad','JOBS REFUSED AT THE DOOR','The queue protected itself by refusing the jobs it exists to hold. Messages, notifications and everything else behind it failed loudly.','Slack 2017: at the memory limit, no new job could be added.','full');
    if(d) d.setAttribute('stroke','#3a4158'); SIM.backlog=8; return {cls:'bad'};
   }
   if(t==='UPSTREAM'){
    await phase(14,function(s){ s.backlog=Math.min(s.cap*0.8,s.backlog+14*0.15-6*0.15); s.drainNow=6; });
    say('EVENT 2/6','The queue <b>slows its senders down</b> to protect itself. They feel it as network delay they can\'t explain, and their own requests pile up. Then a timeout kills the slowed processes over and over, and their restarts flood the queue with reconnections.');
    ['A','B','C'].forEach(function(x){SIM['wait'+x]=50;}); await phase(10,function(s){ s.drainNow=4; }); await dwell(900);
    card('bad','THE TROUBLE MOVED UPSTREAM','Flow Control slowed the app servers. A timeout setting on them (harakiri) kept killing and restarting their slowed processes, and the reconnections loaded the queue even more. The slowdown fed itself.','DoorDash 2020.','full');
    ['A','B','C'].forEach(function(x){SIM['wait'+x]=0;}); if(d) d.setAttribute('stroke','#3a4158'); SIM.backlog=8; return {cls:'bad'};
   }
   if(t==='CLEAN_SPILL'){
    await phase(20,function(s){ s.spill+=14*0.15-6*0.15; s.backlog=Math.min(s.cap*0.55,s.backlog+0.2); s.drainNow=6; });
    say('EVENT 2/6','The queue stays at a level the workers can handle. The extra lands in <b>a queue on disk in front</b>: a number on disk, not a full queue in memory. Nothing refused, nothing locked.');
    if(d) d.setAttribute('stroke','#3a4158'); await phase(8,function(s){ s.spill=Math.max(0,s.spill-3); s.drainNow=30; });
    card('good','SURVIVED: THE BACKLOG BECAME A NUMBER ON DISK','Kafka took every job as fast as it arrived, and a relay fed jobs into Redis under a rate limit. A build-up now means turning a dial, not hours of manual work. The cost is on the bill: two systems, and someone owns the dial.','Slack 2017.',null);
    SIM.spill=0; return {cls:'good'};
   }
   /* CLEAN_DELAY */
   await phase(20,function(s){ s.backlog=s.backlog+14*0.15-6*0.15; s.drainNow=6; });
   say('EVENT 2/6','The backlog grows, and nothing else happens. A queue on disk takes everything, so the failure downstream becomes <b>delay, not loss</b>.');
   if(d) d.setAttribute('stroke','#3a4158'); await phase(8,function(s){ s.backlog=Math.max(6,s.backlog-4); s.drainNow=30; });
   card('good','SURVIVED: DELAY, NOT LOSS','Senders kept adding jobs, the jobs were kept, and the workers caught up later. Meta\'s queue has held backlogs of hundreds of billions this way. That is the design working. The cost: a backlog is now normal, and everything downstream has to live with the delay.','Meta 2021.',null);
   SIM.backlog=8; return {cls:'good'};
  },
  async function poisonpill(t){
   say('EVENT 3/6','<b>A job arrives that can never succeed</b>: a permanent error, not a passing one (a poison pill). It reaches the front of its line.');
   poison(true); await sleep(700);
   if(t==='HOL_STALL'){
    say('EVENT 3/6','One line, one worker, and each job must finish before the next. The healthy jobs behind it <b>wait forever</b>.');
    await phase(16,function(s){ s.backlog+=14*0.15; s.drainNow=0; s.waitB=Math.min(60,(s.waitB||0)+5); s.waitC=Math.min(60,(s.waitC||0)+5); }); await dwell(900);
    card('bad','HELD UP BY ONE STUCK JOB','A job that can never succeed blocked its line, and every healthy job behind it waited. This is head-of-line blocking. Uber\'s post describes exactly this: a job that can\'t be processed leaves the worker stuck, and the healthy job behind it waits.','Uber 2021.','stuck');
    poison(false); SIM.waitB=0; SIM.waitC=0; SIM.backlog=8; return {cls:'bad'};
   }
   if(t==='CLEAN_REQUEUE'||t==='CLEAN_REQUEUE_LOOP'){
    say('EVENT 3/6','The stuck job goes <b>to the back of the line</b>, and the line moves. '+(t==='CLEAN_REQUEUE_LOOP'?'With retries at full speed forever, it will be back at the front soon, again and again.':'Waiting longer between tries spaces out its returns.'+(K.retry==='cutoff'?' The cutoff will end them.':'')));
    await phase(12,function(s){ s.backlog=Math.max(6,s.backlog-2); s.drainNow=28; }); poison(false);
    card('good','SURVIVED: THE LINE KEPT MOVING', t==='CLEAN_REQUEUE_LOOP'?'The stuck job circles forever, using up the workers on every lap. That cost is on the bill.':'The stuck job steps aside and the others pass. Slack retries a failing job a set number of times, then moves it to a list of failed jobs.','Slack 2017.',null);
    return {cls:'good'};
   }
   if(t==='CLEAN_DLQ'){
    say('EVENT 3/6','The worker <b>refuses it with a code</b>. The proxy parks it in a dead-letter queue, a side queue a person checks, and the marker of everything done up to here <b>moves past it</b>.');
    await phase(12,function(s){ s.backlog=Math.max(6,s.backlog-2); s.drainNow=28; }); poison(false);
    card('good','SURVIVED: SET ASIDE, NOT FIXED','The stuck job no longer holds up everything behind it. But it isn\'t fixed: it waits in the dead-letter queue for a person. That cost is on the bill.','Uber 2021: the dead-letter queue turns blocking into waiting, not into a fix.',null);
    return {cls:'good'};
   }
   say('EVENT 3/6','One process pulls jobs into a <b>small local queue</b>, and several runners take from it. The stuck job ties up one runner while the line keeps moving.');
   await phase(12,function(s){ s.backlog=Math.max(6,s.backlog-2); s.drainNow=24; }); poison(false);
   card('good','SURVIVED: ONE RUNNER WAITS, NOT THE LINE','Fetching is separate from running. The cap on the local queue limits what a crash can lose: a small window, accepted to keep things simple.','DoorDash 2020.',null);
   return {cls:'good'};
  },
  async function whale(t){
   say('EVENT 4/6','<b>Customer A sends 50,000 jobs in a burst</b>, to a partner that takes 1,000 a second from any one customer. B and C sent three each.');
   await phase(10,function(s){ s.backlog+=40; s.waitA=60; s.drainNow=16; });
   if(t==='CLEAN_ISOLATED'){
    say('EVENT 4/6','Order is a query. <b>A is scheduled on its own</b>, and B and C are delivered as if A weren\'t there.');
    await phase(12,function(s){ s.waitB=0; s.waitC=0; s.waitA=Math.max(30,s.waitA-2); s.backlog=Math.max(8,s.backlog-3); });
    card('good','SURVIVED: THE BIG CUSTOMER WAITED ALONE','Each customer is scheduled on its own, over rows. B and C never saw A\'s flood. The separation lives in the scheduling code, and that cost is on the bill.','Segment 2018.',null);
    SIM.waitA=0; return {cls:'good'};
   }
   if(t==='STALL_SAME_PRIORITY'){
    say('EVENT 4/6','Priority decides who goes first, and A, B and C are all <b>the same priority</b>. Priority separates urgent from routine. It doesn\'t separate customers.');
    await phase(14,function(s){ s.waitB=Math.min(60,(s.waitB||0)+5); s.waitC=Math.min(60,(s.waitC||0)+5); s.drainNow=16; }); await dwell(900);
    card('bad','B AND C STUCK BEHIND A: PRIORITY DIDN\'T HELP','Most important first is a different promise from every customer keeps moving. A\'s 50,000 routine jobs and B\'s three routine jobs are equals in a priority queue.','Segment 2018 (the burst). Meta 2021 uses priority for a different problem.','order');
    SIM.waitA=0; SIM.waitB=0; SIM.waitC=0; return {cls:'bad'};
   }
   say('EVENT 4/6','One shared line. B and C are <b>50 seconds behind A</b>. Every way out is bad: cap A and delay customers who did nothing wrong, keep sending and burn retries against the limit, or copy terabytes to a side queue.');
   await phase(14,function(s){ s.waitB=Math.min(60,(s.waitB||0)+5); s.waitC=Math.min(60,(s.waitC||0)+5); s.drainNow=16; }); await dwell(900);
   card('bad','CUSTOMERS STUCK BEHIND ONE BIG BURST','One customer\'s burst became everyone\'s wait. The order was fixed when the jobs were written, so moving anyone ahead of A means rewriting the data.','Segment 2018.','order');
   SIM.waitA=0; SIM.waitB=0; SIM.waitC=0; SIM.backlog=8; return {cls:'bad'};
  },
  async function crash(t){
   say('EVENT 5/6','<b>A worker crashes</b> holding a job it was handed but hadn\'t finished.');
   var d=document.getElementById('drainbox'); if(d){d.setAttribute('stroke','#ef4444'); d.classList.add('bpulse');} await sleep(800); if(d){d.classList.remove('bpulse'); d.setAttribute('stroke','#3a4158');}
   if(t==='LOST_ITEM'){
    say('EVENT 5/6','The job was marked done when it was <b>handed out</b>. Nothing knows it wasn\'t finished. It is gone.');
    await dwell(900);
    card('bad','A JOB VANISHED','Marked done when handed out, never finished. In a billing queue, that is a charge silently dropped.','Uber 2021: marking a job done on hand-out turns a blockage into lost data.','done');
    return {cls:'bad'};
   }
   say('EVENT 5/6','No confirmation came, so the job is <b>handed out again</b>, to a worker that is alive. A slow worker would have looked exactly like a dead one, and its job would arrive twice.');
   stamp('dupetxt','handed out again · may repeat'); await phase(8,function(s){ s.drainNow=28; }); stamp('dupetxt','');
   card('good','SURVIVED: HANDED OUT AGAIN, NOT LOST','Nobody confirmed the job, so it came back. Now every worker has to cope with seeing the same job twice. That cost is on the bill.','Meta 2021, Uber 2021.',null);
   return {cls:'good'};
  },
  async function partner(t){
   say('EVENT 6/6','<b>The partner slows and starts failing</b> for 105 minutes. Most deliveries fail. The queue soaks up about 85 million events.');
   SIM.partner='DOWN'; await phase(12,function(s){ s.backlog+=6; s.drainNow=0; s.rps=0; });
   SIM.partner='recovering';
   if(t==='STORM'){
    say('EVENT 6/6','It comes back. Every retry fires <b>at full speed, at once</b>.');
    await phase(12,function(s){ s.rps=Math.min(100000,(s.rps||0)+12000); s.backlog=Math.max(8,s.backlog-4); s.drainNow=30; }); await dwell(900);
    card('bad','RETRY STORM: 100,000 A SECOND AT A PARTNER THAT NORMALLY TAKES 16,000','The queue that soaked up the outage became a second problem for the partner. A queue that never gives up has to decide how hard to keep knocking.','Segment 2018: its requests peaked at about six times the partner\'s normal load.','retry');
    SIM.rps=0; SIM.partner='up'; return {cls:'bad'};
   }
   say('EVENT 6/6','It comes back. Retries return <b>with longer and longer waits between them</b>. The first burst still lands, then the curve smooths. The whole backlog is delivered within 30 minutes of recovery.'+(t==='CLEAN_CUTOFF'?' The outage never reached the four-hour cutoff, so nothing was archived.':''));
   await phase(12,function(s){ s.rps=Math.max(4000,20000-1500*(s.rps===undefined?0:1)); s.backlog=Math.max(8,s.backlog-5); s.drainNow=30; });
   card('good','SURVIVED: DELIVERED LATE', t==='CLEAN_CUTOFF'?'About 85 million events soaked up and delivered within 30 minutes of recovery. Nothing reached the four-hour cutoff this time. Anything that does is archived, not delivered.':'About 85 million events soaked up and delivered within 30 minutes of recovery. Late is the cost, and the partner still took a first burst.','Segment 2018.',null);
   SIM.rps=0; SIM.partner='up'; return {cls:'good'};
  }
 ];

 function chips(){ var h=''; EVMETA.forEach(function(m,i){h+='<div class="evchip" data-i="'+i+'">'+m.chip+'</div>';}); $('#evchips').innerHTML=h; }
 function meters(d){ function set(id,v,bad){var e=$(id); e.textContent=v; e.className='n '+(v===0?'good':bad);} set('#m-lost',d.lost,'bad'); set('#m-stall',d.stalled,'bad'); set('#m-out',d.outage,'bad'); }
 function lock(on){ $('#artB').classList.toggle('locked',on); $('#runbtn').disabled=on; $('#stepbtn').disabled=on; }
 async function playEvent(i){ curEv=i; var t=dayDamage.ev[i].t; var chip=$('.evchip[data-i="'+i+'"]'); chip.classList.add('now'); var res=await EVENTS[i](t); chip.classList.remove('now'); chip.classList.add(res.cls==='good'?'clean':'hurt'); await sleep(500); }
 function freshDay(){ dayDamage=dayTokens(K); evIdx=0; SIM={backlog:8,cap:100,drainCap:30,arr:14,waitA:0,waitB:0,waitC:0,partner:'up',spill:0}; $('#log').innerHTML=''; chips(); drawStage(); ['#m-lost','#m-stall','#m-out'].forEach(function(s){$(s).textContent='-';$(s).className='n';}); }
 function renderBill(bill){ var host=$('#bill'); if(!bill||!bill.length){host.style.display='none';return;} host.style.display=''; host.innerHTML='<div class="billhead">THE BILL: what your design pays to survive</div>'+bill.map(function(b){return '<div class="billrow'+(b.base?' base':'')+'">'+(b.base?'<span class="bl">BASELINE</span> ':'')+b.c+' <span class="bs">'+b.s+'</span></div>';}).join(''); }
 async function finishDay(){
  runsDone++; var rb=$('#runbtn'); rb.innerHTML='RUN AGAIN ▶'; setCue(won?'':'deck');
  meters(dayDamage); renderBill(dayDamage.win?dayDamage.bill:null);
  if(dayDamage.win){
   say('DAY SURVIVED','Nothing lost, nobody stalled, no outage, and a bill. Every queue pays something, and yours is itemized. Now hold it: <b>the five attacks below are real failures that queues like yours still hit.</b>');
   card('good','DAY SURVIVED','Nothing lost, nobody stalled, no outage. The bill lists what this design pays for that, each line named by the company that paid it first.','',null);
   if(!won){won=true;buildLevels();} $('#escwrap').style.display=''; setCue('');
  } else say('DAY OVER','See what broke. Each result points at one of your decisions. The comparison below shows how the five companies handled it. Change a decision and run again.');
 }
 async function runAll(){ if(running) return; if(escMode>=0){ if(!FREE){say('ATTACK ACTIVE','Finish the attack first: fix it with your decisions and run it again. The day can wait.');return;} escAbandon(); } running=true; lock(true); setCue(''); freshDay(); for(var i=0;i<6;i++) await playEvent(i); await finishDay(); lock(false); running=false; }
 async function stepOne(){ if(running) return; if(escMode>=0){ if(!FREE){say('ATTACK ACTIVE','Finish the attack first.');return;} escAbandon(); } if(evIdx===0||evIdx>=6) freshDay(); running=true; lock(true); setCue(''); await playEvent(evIdx); evIdx++; if(evIdx>=6) await finishDay(); else say('PAUSED','Event '+evIdx+' of 6 done. Press STEP for the next.'); lock(false); running=false; }

 /* ---------- attacks ---------- */
 var LEVELS=[
  {t:'A1 · UBER: A DEPLOY RESHUFFLES THE WORKERS',group:'dedupe',
   brief:'Whenever a worker joins or leaves, Kafka pauses and reassigns which worker reads which line. How you track progress decides what comes back.',
   attack:async function(){
    if(K.done==='watermark'){ say('ATTACK 1','A deploy restarts the workers, and the lines are reassigned. Jobs that were <b>confirmed but not yet under the marker</b> are delivered again.'); ROWS_ADDED.dedupe=true; if(!K.dedupe) K.dedupe='no'; LEVELS[0].group='dedupe'; paintDeck(); stamp('dupetxt','delivered twice'); await sleep(900); card('bad','DONE TWICE AFTER THE RESHUFFLE','Progress lived in two places: the proxy knew these jobs were done, but Kafka only knew the marker. The jobs in between came back and were done twice. A new decision appeared: what your workers do with a repeat.','Uber 2021.','dedupe'); say('ATTACK 1','Decide what your workers do with a repeat, then run the attack again.'); }
    else if(K.done==='fetch'){ LEVELS[0].group='done'; paintDeck(); say('ATTACK 1','A deploy restarts the workers. Jobs marked done when handed out were still in progress. They are <b>gone</b>.'); await sleep(900); card('bad','LOST IN THE RESHUFFLE','Marked done when handed out, never finished, and never coming back.','Uber 2021: marking a job done on hand-out turns a blockage into lost data.','done'); say('ATTACK 1','Change what done means, then run the attack again.'); }
    else { LEVELS[0].group='done'; paintDeck(); say('ATTACK 1','A deploy restarts the workers. Jobs whose workers died <b>come back when their time limit runs out</b>, to live workers.'); await sleep(900); say('ATTACK 1','Nothing lost, and some jobs seen twice, a cost already on your bill. Run it again to confirm it holds.'); }
    stamp('dupetxt','');
   },
   rerun:async function(){
    if(K.done==='fetch'){ stamp('dupetxt','lost'); await sleep(700); stamp('dupetxt',''); card('bad','STILL LOSING JOBS ON RESTART','Marking a job done on hand-out leaves no way to know it wasn\'t finished.','Uber 2021.','done'); return {held:false}; }
    if(K.done==='watermark'&&K.dedupe!=='yes'){ stamp('dupetxt','done twice'); await sleep(700); stamp('dupetxt',''); card('bad','BROKE AGAIN: REPEATS DONE TWICE','Jobs confirmed but not yet under the marker came back, and nothing downstream recognized them.','Uber 2021.','dedupe'); return {held:false}; }
    stamp('dupetxt','repeat skipped ✓'); await sleep(700); stamp('dupetxt','');
    card('good','HELD: REPEATS SPOTTED AND SKIPPED', K.done==='watermark'?'Jobs may arrive more than once, and your workers skip the repeats. That habit has to hold forever. That cost is on the bill.':'The time limit turned the restart into a second delivery, and your workers already cope with seeing a job twice.', K.done==='watermark'?'Uber 2021.':'Meta 2021.',null); return {held:true};
   },
   hints:[['stop the reshuffle from happening','Every deploy adds and removes workers, so it reshuffles. A gentler reshuffle softens it, but some jobs still come back. That is built in.'],['have workers spot and skip repeats','Uber\'s answer. The cost is that spotting repeats has to keep working forever.'],['mark jobs done before working on them, to avoid repeats','That is marking done on hand-out. It turns the repeat into a lost job.']]},
  {t:'A2 · SLACK: THE SLOWDOWN LASTS THREE DAYS',group:'retention',
   brief:'You survived a slow afternoon. Now the workers stay slow for three days. Where does the backlog go?',
   attack:async function(){
    var spilled=(K.full==='relay')||(K.where!=='mem'&&K.full==='accept');
    if(!spilled){ LEVELS[1].group='full'; paintDeck(); say('ATTACK 2','Three days of slow workers. '+(K.where==='mem'?'Memory fills again, and this time nobody is around to unstick it.':'The queue '+(K.full==='reject'?'refuses jobs for three days.':'slows its senders for three days.'))); await sleep(900); card('bad','THREE DAYS OF THE SAME FAILURE','The afternoon\'s failure, for three days. Change what the queue does when full, then run the attack again.','Slack 2017.','full'); return; }
    say('ATTACK 2','Three days of slow workers. The queue on disk grows and grows, and it only keeps jobs for a set time. A new decision appeared: how long the queue on disk keeps jobs. It starts at two days.');
    ROWS_ADDED.retention=true; if(!K.retention) K.retention='2d'; LEVELS[1].group='retention'; paintDeck();
    await phase(12,function(s){ s.spill+=30; s.backlog=Math.min(60,s.backlog+1); s.drainNow=6; }); await dwell(900);
    card('bad','THE OLDEST JOBS EXPIRED UNDELIVERED','The backlog lasted longer than the two days the queue keeps jobs. The queue held everything, until it didn\'t. Nothing locked up, and jobs still vanished.','Slack 2017: the backlog now piles up in Kafka, which keeps jobs for two days.','retention');
    say('ATTACK 2','Decide how long to keep jobs, then run the attack again, and read the bill.');
   },
   rerun:async function(){
    var spilled=(K.full==='relay')||(K.where!=='mem'&&K.full==='accept');
    if(!spilled){ await sleep(700); card('bad','STILL FAILING FOR THREE DAYS','When full, the queue doesn\'t overflow to anything on disk.','Slack 2017.','full'); return {held:false}; }
    if(!ROWS_ADDED.retention){ ROWS_ADDED.retention=true; if(!K.retention) K.retention='2d'; LEVELS[1].group='retention'; paintDeck(); await phase(10,function(s){s.spill+=30;}); card('bad','NOW THE BACKLOG HAS A TIME LIMIT','Your queue overflows to disk now, and disk keeps jobs for a set time. It starts at two days. Decide, then run it again.','Slack 2017.','retention'); return {held:false}; }
    await phase(10,function(s){ s.spill+=30; s.drainNow=6; });
    if(K.retention==='2d'){ card('bad','BROKE AGAIN: JOBS EXPIRED','Three days of backlog, and jobs are kept for two.','Slack 2017.','retention'); SIM.spill=0; return {held:false}; }
    if(K.retention==='unbounded'){ card('warn','HELD, BY NEVER DELETING ANYTHING','Nothing expired. Now the disk is what fills up, and the bill turns red on storage.','Slack 2017 kept two days.','retention'); SIM.spill=0; dayDamage=dayTokens(K); renderBill(dayDamage.bill); return {held:true}; }
    card('good','HELD: A WEEK OF HEADROOM','Three days of backlog, and jobs are kept for a week. Storage is now sized for the bad week, and someone still chooses the drain rate. Both are on the bill.','Slack 2017.',null); SIM.spill=0; dayDamage=dayTokens(K); renderBill(dayDamage.bill); return {held:true};
   },
   hints:[['add more workers','Then it isn\'t a three-day slowdown. The attack is what happens when you can\'t.'],['keep jobs long enough to cover the bad week','Slack\'s approach. Two days was their number. The point is that the number is a decision.'],['keep everything forever','It holds, and the disk becomes what fills up. Try it.']]},
  {t:'A3 · DOORDASH: THE QUEUE\'S FLOW CONTROL KICKS IN',group:'full',
   brief:'This attack changes one of your decisions. Like RabbitMQ, your queue now slows its senders down when it feels pressure.',
   attack:async function(){
    say('ATTACK 3','Your queue has <b>Flow Control built in</b>, like RabbitMQ, and it kicks in under load. Your WHEN FULL decision just changed under you.');
    K.full='throttle'; paintDeck(); drawStage(); await sleep(700);
    say('ATTACK 3','A peak arrives. The queue slows the app servers, and they feel it as delay. A timeout on the app servers kills their slowed processes over and over, and the restarts flood the queue. It stays this way until you change it back.');
    ['A','B','C'].forEach(function(x){SIM['wait'+x]=50;}); await phase(10,function(s){s.drainNow=4;}); await dwell(900);
    card('bad','THE SLOWDOWN FED ITSELF','The slowing reached the senders as delay nobody could explain, and the timeout-and-restart loop made it worse.','DoorDash 2020.','full');
    ['A','B','C'].forEach(function(x){SIM['wait'+x]=0;}); paintSim();
   },
   rerun:async function(){
    if(K.full==='throttle'){ ['A','B','C'].forEach(function(x){SIM['wait'+x]=50;}); await phase(8,function(s){s.drainNow=4;}); ['A','B','C'].forEach(function(x){SIM['wait'+x]=0;}); paintSim(); card('bad','BROKE AGAIN: SENDERS STILL SLOWED','A queue that handles overload by slowing its senders has passed the pressure on, where nobody can see it.','DoorDash 2020.','full'); return {held:false}; }
    await phase(8,function(s){s.drainNow=K.full==='relay'?30:14; if(K.full==='relay') s.spill+=2;}); SIM.spill=0;
    if(K.full==='reject'){ card('bad','BROKE: NOW SENDERS GET ERRORS INSTEAD','Refusing is at least visible, but the jobs are still gone.','Slack 2017.','full'); return {held:false}; }
    card('good','HELD: THE PRESSURE HAS SOMEWHERE TO GO','The queue '+(K.full==='relay'?'overflows to disk and feeds the workers at their pace':'accepts and delays')+' instead of making its senders guess. Decide who feels a full queue before it fills.','DoorDash 2020 shows what goes wrong. Slack 2017 and Meta 2021 show the fixes.',null); return {held:true};
   },
   hints:[['tune Flow Control\'s limits','The senders still can\'t tell being slowed down from a slow network. The mechanism is the problem.'],['make the queue accept, or overflow to disk','That is the WHEN FULL decision. The attack changed it.'],['raise the timeout','It slows the restart loop, but not the slowing that starts it.']]},
  {t:'A4 · META: THE BACKLOG REACHES HUNDREDS OF BILLIONS',group:'scans',
   brief:'You accepted delay as part of the deal. Now the backlog is enormous. Does the queue itself get slower?',
   attack:async function(){
    if(K.where==='rows'){ say('ATTACK 4','The backlog is a hundred billion rows. The database keeps <b>old versions of rows in a list that grows with the backlog</b>, and the background lookups that mark jobs ready and expire time limits have to walk it. A new decision appeared: how the lookups run.'); ROWS_ADDED.scans=true; if(!K.scans) K.scans='full'; LEVELS[3].group='scans'; paintDeck(); await phase(12,function(s){s.backlog+=50; s.drainNow=Math.max(2,30-s.backlog/12);}); await dwell(900); card('bad','THE DRAIN SLOWED AS THE BACKLOG GREW','The queue\'s own storage got slower the fuller it was. Reads slowed as the list of old versions grew.','Meta 2021.','scans'); say('ATTACK 4','Decide how the lookups run, then run the attack again.'); }
    else if(K.where==='log'){ LEVELS[3].group='where'; paintDeck(); say('ATTACK 4','The backlog is enormous. A log doesn\'t slow down as it grows, it just fills. How long it keeps jobs decides the rest (attack 2).'); await phase(8,function(s){s.backlog+=50;}); say('ATTACK 4','Nothing to fix here that attack 2 didn\'t. Run it again to confirm.'); }
    else { LEVELS[3].group='where'; paintDeck(); say('ATTACK 4','The backlog is enormous, and yours lives in memory. It locked up long before hundreds of billions.'); await phase(8,function(s){s.backlog=s.cap;s.seized=true;}); SIM.seized=false; card('bad','MEMORY CAN\'T HOLD A BACKLOG THIS DEEP','Delay, not loss, needs storage that can hold the delay.','Slack 2017, Meta 2021.','where'); }
   },
   rerun:async function(){
    if(K.where==='mem'){ await phase(6,function(s){s.backlog=s.cap;}); card('bad','STILL LOCKING UP','A queue in memory can\'t hold a backlog this deep.','Slack 2017.','where'); SIM.backlog=8; return {held:false}; }
    if(K.where==='log'){ await phase(6,function(s){s.backlog+=20;}); card('good','HELD: A LOG FILLS BUT DOESN\'T SLOW','A deeper backlog costs disk, not speed. How long you keep jobs is the decision that matters, and you made it.','Slack 2017.',null); SIM.backlog=8; return {held:true}; }
    if(!ROWS_ADDED.scans){ ROWS_ADDED.scans=true; if(!K.scans) K.scans='full'; LEVELS[3].group='scans'; paintDeck(); }
    await phase(8,function(s){ s.backlog+=50; s.drainNow=K.scans==='checkpoint'?30:Math.max(2,30-s.backlog/12); });
    if(K.scans!=='checkpoint'){ card('bad','BROKE AGAIN: LOOKUPS WALK THE WHOLE HISTORY','Reads slow down as the backlog grows.','Meta 2021.','scans'); SIM.backlog=8; return {held:false}; }
    card('good','HELD: LOOKUPS START FROM A CHECKPOINT','A saved marker of the last job already handled sets where each lookup starts, so it reads only new work. The list it walks stays short, and the reads stay fast. Keeping that up is on the bill.','Meta 2021.',null); dayDamage=dayTokens(K); renderBill(dayDamage.bill); SIM.backlog=8; return {held:true};
   },
   hints:[['add more database servers','That spreads the backlog, but every lookup still walks the list of old versions. The new decision is the fix.'],['start every lookup from a checkpoint','Meta\'s answer. The new decision has this option.'],['clean out old rows more often','Cleaning out old rows is itself a lookup by time, so it walks the same list.']]},
  {t:'A5 · SEGMENT: THE PARTNER IS DOWN FOR SIX HOURS',group:'archive',
   brief:'You chose how retries behave. Now the outage lasts longer than any cutoff you might have set.',
   attack:async function(){
    SIM.partner='DOWN'; paintSim();
    if(K.retry==='forever'){ LEVELS[4].group='retry'; paintDeck(); say('ATTACK 5','Six hours down. Six hours of retries <b>at full speed</b> against a partner that isn\'t responding, and then a storm when it is.'); await phase(10,function(s){s.rps=90000;}); SIM.rps=0; await dwell(900); card('bad','SIX HOURS OF KNOCKING, THEN A STORM','The queue that soaked up the outage became a second problem for the partner, twice.','Segment 2018.','retry'); }
    else if(K.retry==='backoff'){ LEVELS[4].group='retry'; paintDeck(); say('ATTACK 5','Six hours down. Retries wait longer and longer, and the pile of retries grows with no limit. When the partner returns, everything is delivered, late.'); await phase(10,function(s){s.backlog+=8;}); say('ATTACK 5','It holds. The cost is delivery six hours late, and a retry pile with no ceiling. Run it again to confirm.'); }
    else { say('ATTACK 5','Six hours down. Your <b>four-hour cutoff</b> passed at hour four. Everything older is archived, and the partner comes back at hour six. A new decision appeared: what happens to archived jobs.'); ROWS_ADDED.archive=true; if(!K.archive) K.archive='drop'; LEVELS[4].group='archive'; paintDeck(); await phase(10,function(s){s.backlog=Math.max(8,s.backlog-6);}); await dwell(900); card('bad','TWO HOURS OF JOBS ARCHIVED, AND GONE','The cutoff did its job, and the jobs it cut are nobody\'s problem. The customers whose events those were would disagree.','Segment 2018 archives to S3. What happens next is the decision.','archive'); }
    SIM.partner='up'; paintSim();
   },
   rerun:async function(){
    SIM.partner='DOWN'; paintSim(); await phase(6,function(s){});
    SIM.partner='up'; paintSim();
    if(K.retry==='forever'){ await phase(6,function(s){s.rps=90000;}); SIM.rps=0; paintSim(); card('bad','STILL STORMING','Retries at full speed, forever.','Segment 2018.','retry'); return {held:false}; }
    if(K.retry==='backoff'){ await phase(6,function(s){s.rps=16000;s.backlog=Math.max(8,s.backlog-6);}); SIM.rps=0; paintSim(); card('warn','HELD: DELIVERED SIX HOURS LATE, NO CEILING ON RETRIES','Waiting longer each time with no cutoff never gives up. That is the promise and the cost.','Segment 2018.',null); return {held:true}; }
    if(!ROWS_ADDED.archive){ ROWS_ADDED.archive=true; if(!K.archive) K.archive='drop'; LEVELS[4].group='archive'; paintDeck(); card('bad','THE CUTOFF PASSED: WHAT HAPPENS TO THE ARCHIVE?','A new decision appeared. Decide, then run it again.','Segment 2018.','archive'); return {held:false}; }
    if(K.archive!=='replay'){ card('bad','BROKE AGAIN: ARCHIVED JOBS STAYED GONE','Two hours of events in cold storage that nobody replays.','Segment 2018.','archive'); return {held:false}; }
    await phase(6,function(s){s.rps=16000;}); SIM.rps=0; paintSim();
    card('good','HELD: ARCHIVED, THEN REPLAYED BY HAND','The cutoff limited the retry storm, the archive kept the jobs, and a person replayed them. Put off, not lost, and a standing job on the bill.','Segment 2018 archives to S3. Uber 2021 replays its dead-letter queue by hand, the closest thing to this.',null); dayDamage=dayTokens(K); renderBill(dayDamage.bill); return {held:true};
   },
   hints:[['keep retrying, it will come back','Six hours of full-speed knocking, then a storm. You watched it.'],['wait longer each time and never give up','It holds, with no ceiling on the retry pile.'],['cut off, archive, and keep replay tools','Segment archives to S3. The replay is the missing half.']]}
 ];

 function escEnter(i){ escMode=i; curLvl=i+1; paintDeck(); setCue('group'); var lvlEl=$$('#lvls .lvl')[i]; lvlEl.querySelector('.fixrow').style.display=''; say('YOUR MOVE','Fix it with your decisions (the group that matters is glowing), then <b>run the attack again</b>. Hints are under the attack.'); }
 function escAbandon(){ if(escMode<0) return; var lvlEl=$$('#lvls .lvl')[escMode]; if(lvlEl) lvlEl.querySelector('.fixrow').style.display='none'; escMode=-1; curLvl=0; setCue(''); paintDeck(); }
 function escExit(i,held){ if(!held) return; escMode=-1; curLvl=0; lvlDone[i]=true; var lvlEl=$$('#lvls .lvl')[i]; lvlEl.querySelector('.done').style.display='inline'; lvlEl.querySelector('.fixrow').style.display='none'; setCue(''); paintDeck(); if(i+1<LEVELS.length){$$('#lvls .lvl')[i+1].classList.remove('locked2'); say('ATTACK '+(i+1)+' SURVIVED','Your design held. The next attack is unlocked.');} if(lvlDone.every(Boolean)) buildDebrief(); }
 function buildLevels(){
  var host=$('#lvls'); host.innerHTML='';
  LEVELS.forEach(function(L,i){ var d=document.createElement('div'); d.className='lvl'+(i>0&&!FREE?' locked2':''); d.innerHTML='<div class="lt">'+L.t+' <span class="done">\u2713 HELD</span></div><div class="lq">'+L.brief+' <span class="watch" data-lvl="'+i+'">\u25B6 watch the attack</span></div><div class="fixrow" style="display:none;"><button class="opt rerunbtn" data-lvl="'+i+'">RE-RUN THE ATTACK \u25B6</button></div><details class="hints"><summary>HINTS</summary>'+L.hints.map(function(h,j){return '<button class="opt hintbtn" data-lvl="'+i+'" data-h="'+j+'">'+h[0]+'</button>';}).join('')+'<div class="verdict"></div></details>'; host.appendChild(d); });
  $$('#lvls .watch').forEach(function(w){ w.addEventListener('click',async function(){ var i=+w.dataset.lvl; if(running) return; if(!FREE&&($$('#lvls .lvl')[i].classList.contains('locked2')||lvlDone[i])) return; if(FREE&&escMode>=0&&escMode!==i) escAbandon(); running=true; lock(true); curLvl=i+1; drawStage(); await LEVELS[i].attack(); lock(false); running=false; escEnter(i); });});
  $$('#lvls .rerunbtn').forEach(function(b){ b.addEventListener('click',async function(){ var i=+b.dataset.lvl; if(running||escMode!==i) return; running=true; lock(true); curLvl=i+1; drawStage(); var res=await LEVELS[i].rerun(); lock(false); running=false; escExit(i,!!res.held); });});
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
 function freePlayOn(){ FREE=true; won=true; ROWS_ADDED={dedupe:true,retention:true,scans:true,archive:true}; if(!K.dedupe)K.dedupe='no'; if(!K.retention)K.retention='2d'; if(!K.scans)K.scans='full'; if(!K.archive)K.archive='drop'; buildLevels(); $('#escwrap').style.display=''; paintDeck(); var fb=$('#freebtn'); if(fb){fb.textContent='FREE PLAY: ON';fb.classList.add('on');fb.disabled=true;} var fn=$('#freenote'); if(fn) fn.style.display=''; say('FREE PLAY','Every gate is off. Prototype only.'); }

 $('#runbtn').addEventListener('click',runAll);
 $('#stepbtn').addEventListener('click',stepOne);
 $('#freebtn').addEventListener('click',function(){if(!running) freePlayOn();});
 $('#resetbtn').addEventListener('click',function(){ if(running) return; K=Object.assign({},NAIVE); ROWS_ADDED={dedupe:false,retention:false,scans:false,archive:false}; won=false; lvlDone=[false,false,false,false,false]; evIdx=0; escMode=-1; curLvl=0; runsDone=0; var rb=$('#runbtn'); rb.innerHTML='RUN THE DAY \u25B6'; setCue('run'); $('#escwrap').style.display='none'; $('#debrief').className='debrief'; $('#bill').style.display='none'; freshDay(); paintDeck(); say('READY','Starting decisions restored. Run the day.'); if(FREE) freePlayOn(); });
 chips(); drawStage(); paintDeck(); setCue('run');
 if(FREE) freePlayOn();
 say('READY','Your decisions start out naive on purpose: a queue in memory that accepts everything, a stuck job that blocks its line, one shared line, done when handed out, and retries forever. <b>Run the day as it is first, and see what breaks.</b>');
 window.__QB={dayTokens:dayTokens,K:function(){return K;}};
})();
