// The RULES block of the queue-backlog mission (prototype v1.3, mission.js,
// between /*RULES-START*/ and /*RULES-END*/), as a dependency-free pure
// function. VERBATIM: 1,188 decision sets -> 60 clean, with 60 different
// bills (19 kinds of cost). Imported by the mission artifact
// (content/artifacts/problem-queue-backlog-mission.jsx) and by the rules-parity
// test (tests/unit/queue-backlog-rules-parity.test.ts), which checks it
// against the prototype's own dayTokens() on all 128,304 combinations,
// including the four decisions that attacks add.
//
// Events: routine, slowdown, poison (a stuck job), whale (one big customer),
// crash, partner. Meters: lost, stalled, outage. Bill lines name the company
// that paid the cost first (v1.3 fact-check credits).

/* eslint-disable */
export function dayTokens(Q){
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
