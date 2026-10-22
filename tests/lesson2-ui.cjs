const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto'),{JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),errors=[],downloads=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
const dom=new JSDOM(fs.readFileSync(path.join(root,'lesson2/index.html'),'utf8'),{url:'https://lab.test/lesson2/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,$=id=>w.document.getElementById(id);Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=structuredClone;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
for(const s of w.document.querySelectorAll('script[src]'))w.eval(fs.readFileSync(path.resolve(root,'lesson2',s.getAttribute('src')),'utf8'));
const wait=async fn=>{for(let i=0;i<500;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('Timeout');};
let n=0;function ok(x,msg){assert.ok(x,msg);n++;}
(async()=>{
 await wait(()=>$('input-status').textContent.startsWith('Stored'));ok(!$('lab-error').textContent,'default encryption');ok($('byte-counts').children.length===256,'byte table');
 $('decrypt').click();await wait(()=>!$('decrypt').disabled);ok($('ecc-plain').textContent===$('message-input').value,'decrypt UI');
 $('decrypt-key').value='174';$('decrypt').click();await wait(()=>!$('decrypt').disabled);ok($('decrypt-status').textContent.includes('failed'),'wrong-key UI');
 $('tamper').click();await wait(()=>!$('tamper').disabled);ok($('decrypt-status').textContent.includes('correct decryption key'),'tamper test checks unchanged packet first');
 $('decrypt-key').value='173';$('tamper').click();await wait(()=>!$('tamper').disabled);ok($('decrypt-status').textContent.includes('rejected'),'tamper UI');
 $('search').click();await wait(()=>!$('search').disabled);ok($('search-status').textContent.includes('Recovered d = 173'),'attack UI');ok($('recovered-message').textContent===$('message-input').value,'recovered plaintext UI');
 $('bound').value='10';$('search').click();await wait(()=>!$('search').disabled);ok($('search-status').textContent.includes('No match'),'excluded bound');
 $('run-trials').click();await wait(()=>!$('run-trials').disabled);ok($('trial-results').children.length===7,'length results');
 for(const id of ['export-trials','export-distributions','download-packet'])$(id).click();ok(downloads.length===3,'exports');
 $('attack-text').value='123';$('rank').click();ok($('rank-status').textContent.includes('at least one'),'letter-free input');
 $('private-key').value='0';$('encrypt').click();await wait(()=>!$('encrypt').disabled);ok($('lab-error').textContent.includes('integer'),'invalid key');
 $('custom-corpus').value='too short';$('rank').click();ok($('rank-status').textContent.includes('1,000'),'short corpus rejected');
 ok(errors.length===0,'no uncaught DOM errors');console.log('PASS · '+n+' Lesson 2 DOM interactions');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
