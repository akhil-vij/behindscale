import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('problem-page-v6.html','utf8');
const errors=[];
const dom = new JSDOM(html,{url:'http://localhost/p.html',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  // accelerate time
  const oST=w.setTimeout.bind(w);
  w.setTimeout=(fn,ms,...a)=>oST(fn,Math.max(0,(ms||0)/200),...a);
  let fake=0;
  w.requestAnimationFrame=(cb)=>oST(()=>{fake+=400;cb(fake);},1);
  w.performance.now=()=>fake;
  w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
  w.SVGElement.prototype.getBBox=()=>({x:0,y:0,width:10,height:10});
  w.Element.prototype.scrollIntoView=function(){};
  w.addEventListener('error',e=>errors.push(String(e.error||e.message)));
}});
const w=dom.window, d=w.document;
w.console.error=(...a)=>errors.push(a.join(' '));
const $=s=>d.querySelector(s), $$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const text=s=>($(s)?.textContent||'').trim().replace(/\s+/g,' ');
async function until(fn,label,max=8000){const t0=Date.now();while(Date.now()-t0<max){if(fn())return true;await sleep(50);}console.log('TIMEOUT waiting:',label);return false;}
function clickDeck(k,v){const b=d.querySelector(`#deck button[data-k="${k}"][data-v="${v}"]`); if(!b){console.log('no button',k,v);return;} if(b.disabled){console.log('disabled',k,v);} b.click();}
const score=()=>['#m-dbl','#m-lost','#m-tick'].map(text).join('/');
const cards=()=>$$('#dlog .card, .dcard, #damage .card').map(c=>c.textContent.trim().replace(/\s+/g,' ').slice(0,90));
const lastSay=()=>text('#say, #verdict, .verd');
console.log('ids present: runbtn',!!$('#runbtn'),'deck',!!$('#deck'),'bill',!!$('#bill'),'escwrap',!!$('#escwrap'),'debrief',!!$('#debrief'));
// 1. naive run
$('#runbtn').click();
await until(()=>!$('#runbtn').disabled && /\d/.test(text('#m-dbl')),'naive run');
await sleep(300);
console.log('NAIVE score dbl/lost/tick =',score());
console.log('damage log entries:',$$('#dlog > *').length, $$('#dlog > *').slice(0,8).map(c=>c.textContent.trim().replace(/\s+/g,' ').slice(0,80)));

clickDeck('id','key'); clickDeck('mem','acid'); clickDeck('cli','key'); clickDeck('rep','saved'); clickDeck('ret','ever');
$('#runbtn').click();
await until(()=>!$('#runbtn').disabled && $('#escwrap').style.display!=='none','win day',12000);
await sleep(300);
console.log('AWS score =',score(),'| escwrap shown:',$('#escwrap').style.display!=='none','| bill visible:',$('#bill')&&$('#bill').style.display!=='none');
console.log('BILL:',text('#bill').slice(0,400));
console.log('runbtn label:',text('#runbtn'));
console.log('YOU after clean day: th=',text('#you-th'),'| who=',text('#you-c-who'),'| key=',text('#you-c-key'),'| state=',text('#you-c-state'),'| crash=',text('#you-c-crash'),'| rep=',text('#you-c-rep'),'| win=',text('#you-c-win'),'| breaks=',text('#you-c-breaks'));
console.log('diagram: empty hidden',$('#you-empty').style.display==='none','| fill shown',$('#you-fill').style.display!=='none','| dState=',text('#you-d-state'),'| dBreaks=',text('#you-d-breaks'));
console.log('commit box shown:',$('#cmtbox').style.display!=='none');
$('#cmt-input').value='Commit with the work so half-failures cannot exist.'; $('#cmt-lock').click(); await sleep(50);
console.log('locked text:',text('#cmt-locked').slice(0,70),'| foot:',text('#you-commit-foot').slice(0,60),'| stored:',!!w.localStorage.getItem('bs_commit_ambiguous_timeouts'));
console.log('iv ticks:',[1,2,3,4,5].map(i=>text('#you-iv-'+i)).join(','));
// 3. A1
const lvls=()=>$$('#lvls .lvl');
lvls()[0].querySelector('.watch').click();
await until(()=>lvls()[0].querySelector('.fixrow').style.display!=='none','A1 fixrow');
console.log('A1 say:',text('#say')||text('#verd'));
lvls()[0].querySelector('.rerunbtn').click();
await until(()=>lvls()[0].querySelector('.acceptbtn').style.display!=='none','A1 accept shown');
// day run blocked during attack?
const before=score(); $('#runbtn').click(); await sleep(200); console.log('run during attack -> score unchanged:',score()===before, '| say:',text('#say').slice(0,80));
lvls()[0].querySelector('.acceptbtn').click(); await sleep(200);
console.log('A1 held:',lvls()[0].querySelector('.done').style.display, '| A2 unlocked:',!lvls()[1].classList.contains('locked2'));
// 4. A2
lvls()[1].querySelector('.watch').click();
await until(()=>lvls()[1].querySelector('.fixrow').style.display!=='none','A2 fixrow');
console.log('A2 read now:',$('#deck button[data-k="read"].sel')?.dataset.v,'| glow group:',$('#deck .attng')?.id);
lvls()[1].querySelector('.rerunbtn').click(); await until(()=>!$('#runbtn').disabled,'A2 rerun bad'); await sleep(200);
console.log('A2 rerun w/ replica held?',lvls()[1].querySelector('.done').style.display);
clickDeck('read','master'); lvls()[1].querySelector('.rerunbtn').click(); await until(()=>lvls()[1].querySelector('.done').style.display==='inline','A2 held'); console.log('A2 HELD ok | breaks cell now:',text('#you-c-breaks'),'| ticks:',[1,2,3,4,5].map(i=>text('#you-iv-'+i)).join(','));
// 5. A3
lvls()[2].querySelector('.watch').click(); await until(()=>lvls()[2].querySelector('.fixrow').style.display!=='none','A3 fixrow');
lvls()[2].querySelector('.rerunbtn').click(); await until(()=>lvls()[2].querySelector('.done').style.display==='inline','A3 ever'); console.log('A3 ever HELD; last card:',$$('#dlog > *').slice(-1)[0]?.textContent.trim().replace(/\s+/g,' ').slice(0,140));
// 6. A4
lvls()[3].querySelector('.watch').click(); await until(()=>lvls()[3].querySelector('.fixrow').style.display!=='none','A4 fixrow');
console.log('params row present:',!!$('#kg-params'),'default:',$('#deck button[data-k="params"].sel')?.dataset.v);
lvls()[3].querySelector('.rerunbtn').click(); await until(()=>!$('#runbtn').disabled,'A4 rerun run'); await sleep(200);
console.log('A4 run held?',lvls()[3].querySelector('.done').style.display);
clickDeck('params','refuse'); lvls()[3].querySelector('.rerunbtn').click(); await until(()=>lvls()[3].querySelector('.done').style.display==='inline','A4 held'); console.log('A4 HELD ok');
// 7. A5 forever flow
lvls()[4].querySelector('.watch').click(); await until(()=>lvls()[4].querySelector('.fixrow').style.display!=='none','A5 fixrow');
console.log('A5 title:',lvls()[4].querySelector('.lt').textContent.trim().slice(0,80));
console.log('after row present (should be false):',!!$('#kg-after'),'| glow:',$('#deck .attng')?.id);
lvls()[4].querySelector('.rerunbtn').click(); await until(()=>!$('#runbtn').disabled,'A5 still colliding'); await sleep(200);
console.log('A5 rerun w/ ever held?',lvls()[4].querySelector('.done').style.display,'| after row:',!!$('#kg-after'));
clickDeck('ret','day'); lvls()[4].querySelector('.rerunbtn').click(); await until(()=>!$('#runbtn').disabled,'A5 bounded'); await sleep(200);
console.log('A5 after bounding held?',lvls()[4].querySelector('.done').style.display,'| after row present:',!!$('#kg-after'),'default:',$('#deck button[data-k="after"].sel')?.dataset.v);
clickDeck('after','reconcile'); lvls()[4].querySelector('.rerunbtn').click(); await until(()=>lvls()[4].querySelector('.done').style.display==='inline','A5 held'); await sleep(300);
console.log('A5 HELD ok');
console.log('DEBRIEF class:',$('#debrief').className,'| top line:',text('#you-debrief-top').slice(0,140),'| breaks cell:',text('#you-c-breaks'),'| ticks:',[1,2,3,4,5].map(i=>text('#you-iv-'+i)).join(',')); console.log('DEBRIEF text:\n',text('#debrief'));
console.log('BILL final:',text('#bill'));
console.log('\nERRORS:',errors);
