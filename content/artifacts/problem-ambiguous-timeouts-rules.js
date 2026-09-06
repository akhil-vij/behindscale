// The RULES block of the ambiguous-timeouts mission (problem-page-v7.3.html,
// Script 2, between /*RULES-START*/ and /*RULES-END*/), as a dependency-free
// pure function. VERBATIM and FROZEN: 576 decision sets -> exactly 12 clean,
// with the 12 distinct bills of DECKS-v6-1.md. Imported by the mission
// artifact (content/artifacts/problem-ambiguous-timeouts-mission.jsx) and by
// the rules-parity test (tests/unit/rules-parity.test.ts). Do not edit.
//
// v6: events produce FAILURES; the deck produces the BILL; each bill line
// names the company that named the price.

export function dayTokens(Q){
  var id=Q.id, mem=Q.mem, read=Q.read, cli=Q.cli, rep=Q.rep, ret=Q.ret;
  var rec=(id!=='none'&&mem!=='none'&&cli==='key');
  var ev=[];
  ev.push({e:'routine', t:'CLEAN'});
  ev.push({e:'cut1', t: cli==='giveup'?'LOST_SALE':'RECOVERED'});
  ev.push({e:'cut2', t: cli==='giveup'?'TICKET_MYST': !rec?'DBL_CRASH': mem==='store'?'DBL_GAP': mem==='storerec'?'CLEAN_RECOVERY':'CLEAN_ROLLBACK'});
  ev.push({e:'cut3', t: cli==='giveup'?'TICKET_WRITEOFF': !rec?'DBL_CLASSIC': read==='replica'?'DBL_REPLICA': rep==='err'?'CLEAN_ERR_REPLY':'CLEAN_REPLAY'});
  ev.push({e:'twins', t: id==='hash'?'LOST_TWIN':'CLEAN_TWO'});
  ev.push({e:'late', t: !rec?'NA': read!=='master'?'NA': ret==='min'?'DBL_EXPIRE':'CLEAN_LATE'});
  var extra = (id!=='none'&&mem==='none'&&cli!=='giveup') ? 'NONAME' : null;
  var dbl=0,lost=0,tick=0;
  ev.forEach(function(x){
   if(/^DBL/.test(x.t)) dbl++;
   if(/^LOST/.test(x.t)) lost++;
   if(/^TICKET/.test(x.t)) tick++;
  });
  var bill=[];
  if(rec&&read==='master') bill.push({c:'idempotency reads hit the master - the price every safe design pays', s:'Airbnb 2019', base:true});
  if(rec&&mem==='acid') bill.push({c:'the work must live in the same database as its record - nothing that crosses to an external partner can sit inside the commit', s:'Airbnb 2019; AWS 2021'});
  if(rec&&mem==='storerec') bill.push({c:'recovery code per step - someone writes and maintains it', s:'Shopify 2022'});
  if(rec&&rep==='err') bill.push({c:'callers must write branching code - an error that means success', s:'AWS 2021'});
  if(rec&&rep==='saved') bill.push({c:'results stored for every operation - the table grows with traffic and is hard to trim', s:'Airbnb 2019'});
  if(rec&&ret==='ever') bill.push({c:'keys kept without bound - a future key can collide with an ancient one', s:'AWS 2021'});
  if(rec&&(ret==='day'||ret==='size')) bill.push({c:'stragglers after the window - must be caught later, not prevented', s:'Shopify 2022'});
  if(rec&&ret==='size') bill.push({c:'protection window shrinks under load - paged if it thins past a day', s:'Segment 2017'});
  if(Q.after==='reconcile') bill.push({c:'reconciliation is a standing team cost - a job that never ends', s:'Shopify 2022'});
  return { ev:ev, extra:extra, dbl:dbl, lost:lost, tick:tick, bill:bill,
     win:(dbl===0&&lost===0&&tick===0) };
 }

export default dayTokens
