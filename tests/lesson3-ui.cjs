const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto'),{JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),errors=[],downloads=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
const dom=new JSDOM(fs.readFileSync(path.join(root,'lesson3/index.html'),'utf8'),{url:'https://lab.test/lesson3/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window,$=id=>w.document.getElementById(id);
Object.defineProperty(w,'crypto',{value:webcrypto});w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
for(const s of w.document.querySelectorAll('script[src]'))w.eval(fs.readFileSync(path.resolve(root,'lesson3',s.getAttribute('src')),'utf8'));
let checks=0;function ok(x,msg){assert.ok(x,msg);checks++;}const wait=async fn=>{for(let i=0;i<1500;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timeout');};
const input=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('input'));};const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change'));};
(async()=>{
 await wait(()=>!$('run').disabled);ok(!$('simulation-error').textContent,'default run');ok($('lln-rows').children.length===5,'increasing n checkpoints');ok($('moment-rows').children.length===15,'three moments per checkpoint');ok($('cdf-chart').querySelector('svg'),'CDF rendered');
 change('view-model','bernoulli');ok($('clt-explanation').textContent.includes('centered'),'Bernoulli standardization explained');change('view-n','8');ok($('distribution-caption').textContent.includes('n = 8'),'checkpoint selection');
 for(const id of ['export-summary','export-endpoints','export-paths'])$(id).click();ok(downloads.length===3,'all exports');
 input('probability','0');ok($('export-summary').disabled,'stale export disabled');input('systems','16');input('attackers-count','100');$('run').click();await wait(()=>!$('run').disabled);ok($('clt-hist').textContent.includes('undefined'),'zero variance CLT');ok($('aggregate-total').textContent==='0','zero-probability aggregate');
 input('probability','1');$('run').click();await wait(()=>!$('run').disabled);ok($('aggregate-total').textContent==='1,600','certain-success aggregate');
 input('systems','17');$('run').click();await wait(()=>!$('run').disabled);ok($('view-n').value==='17','non-power checkpoint');change('view-model','rademacher');ok($('cdf-chart').querySelector('svg'),'Rademacher unaffected by Bernoulli endpoint');
 input('systems','8192');input('attackers-count','5000');$('run').click();$('cancel').click();await wait(()=>!$('run').disabled);ok($('run-status').textContent.startsWith('Cancelled'),'cancel UI');ok($('view-n').value==='17','cancel preserves completed data');
 input('attackers-count','0');$('run').click();ok($('simulation-error').textContent.includes('Attackers'),'invalid input');ok(errors.length===0,'no uncaught errors');console.log(`PASS · ${checks} Lesson 3 DOM interactions`);dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
