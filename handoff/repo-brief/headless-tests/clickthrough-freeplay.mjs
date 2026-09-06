import { JSDOM } from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync('problem-page-v6.html','utf8'); const errors=[];
const dom=new JSDOM(html,{url:'http://localhost/page.html?free=1',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  const oST=w.setTimeout.bind(w); w.setTimeout=(fn,ms,...a)=>oST(fn,Math.max(0,(ms||0)/200),...a);
  let fake=0; w.requestAnimationFrame=(cb)=>oST(()=>{fake+=400;cb(fake);},1); w.performance.now=()=>fake;
  w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
  w.SVGElement.prototype.getBBox=()=>({x:0,y:0,width:10,height:10}); w.Element.prototype.scrollIntoView=function(){};
  w.addEventListener('error',e=>errors.push(String(e.error||e.message)));}});
const w=dom.window,d=w.document,$=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const text=s=>($(s)?.textContent||'').trim().replace(/\s+/g,' ');
async function until(fn,l,max=8000){const t=Date.now();while(Date.now()-t<max){if(fn())return true;await sleep(50);}console.log('TIMEOUT',l);return false;}
const lvls=()=>$$('#lvls .lvl');
console.log('on load: escwrap visible',$('#escwrap').style.display!=='none','| levels',lvls().length,'| locked',lvls().filter(l=>l.classList.contains('locked2')).length,'| params row',!!$('#kg-params'),'| after row',!!$('#kg-after'),'| freebtn',text('#freebtn'),'| note shown',$('#freenote').style.display!=='none');
// jump straight to A3 with the naive deck? engine expects a key deck; set a deck first but DON'T run a day
for (const [k,v] of [['id','key'],['mem','acid'],['cli','key'],['rep','saved'],['ret','day']]) d.querySelector(`#deck button[data-k="${k}"][data-v="${v}"]`).click();
lvls()[2].querySelector('.watch').click(); await until(()=>lvls()[2].querySelector('.fixrow').style.display!=='none','A3 open without a survived day');
console.log('A3 opened without a day:',lvls()[2].querySelector('.fixrow').style.display!=='none');
// run the day while attack active -> should abandon and run
$('#runbtn').click(); await until(()=>/\d/.test(text('#m-dbl')) && !$('#runbtn').disabled,'day during attack',12000); await sleep(200);
console.log('day ran during attack:',text('#m-dbl'),'| attack fixrow hidden:',lvls()[2].querySelector('.fixrow').style.display==='none');
// watch A5 directly, then A1, out of order
lvls()[4].querySelector('.watch').click(); await until(()=>lvls()[4].querySelector('.fixrow').style.display!=='none','A5'); 
d.querySelector('#deck button[data-k="after"][data-v="reconcile"]').click();
lvls()[4].querySelector('.rerunbtn').click(); await until(()=>lvls()[4].querySelector('.done').style.display==='inline','A5 held'); console.log('A5 held out of order');
lvls()[0].querySelector('.watch').click(); await until(()=>lvls()[0].querySelector('.fixrow').style.display!=='none','A1');
lvls()[0].querySelector('.rerunbtn').click(); await until(()=>lvls()[0].querySelector('.acceptbtn').style.display!=='none','A1 accept'); lvls()[0].querySelector('.acceptbtn').click(); await sleep(100);
console.log('A1 held:',lvls()[0].querySelector('.done').style.display==='inline');
// re-watch a held level
lvls()[4].querySelector('.watch').click(); await sleep(500); console.log('re-watch held A5 allowed (fixrow visible):',lvls()[4].querySelector('.fixrow').style.display!=='none');
// reset keeps free play
$('#resetbtn').click(); await sleep(100); console.log('after reset: escwrap',$('#escwrap').style.display!=='none','locked',lvls().filter(l=>l.classList.contains('locked2')).length,'rows',!!$('#kg-params'),!!$('#kg-after'));
console.log('ERRORS',errors);
