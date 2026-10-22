(() => {
  'use strict';
  const {$,esc,bars,download}=UI,C=CryptoExperiment,E=ethers,corpus=EnglishCorpus;
  let current=null,statistics=null,experiment=null,busy=false,searching=false,cancel=false;
  const letterLabels=Array.from({length:26},(_,i)=>String.fromCharCode(65+i));
  const pause=()=>new Promise(r=>setTimeout(r,0));
  function reference(){const text=$('custom-corpus').value;if(!text.trim())return corpus.counts;const c=C.counts(text);if(c.reduce((a,b)=>a+b,0)<1000)throw Error('Custom reference needs at least 1,000 ASCII letters.');return c;}
  function error(e){$('lab-error').textContent=e.shortMessage||e.message;}
  function lock(value){busy=value;for(const id of ['encrypt','decrypt','tamper','search'])$(id).disabled=value||searching||(!current&&id!=='encrypt');}
  function renderStatistics(){
    const plain=E.toUtf8Bytes(current.message),caesar=E.toUtf8Bytes(current.caesar),encrypted=E.getBytes(current.packet.ciphertext).slice(0,-16);
    const a=C.counts(current.message),b=C.counts(current.caesar),fa=C.frequencies(a),fb=C.frequencies(b),max=Math.max(...fa,...fb,.01)*1.16;
    bars('plain-chart',fa,letterLabels,{max,percent:true,title:'Plaintext ASCII letter frequencies'});
    bars('caesar-chart',fb,letterLabels,{max,percent:true,orange:true,title:'Caesar ciphertext ASCII letter frequencies'});
    statistics=[C.byteStats(plain),C.byteStats(caesar),C.byteStats(encrypted)];
    $('metrics').innerHTML=statistics.map((s,i)=>`<tr><td>${['Plaintext','Caesar','ECC body'][i]}</td><td>${s.n}</td><td>${s.entropy.toFixed(4)}</td><td>${(s.ones*100).toFixed(2)}%</td><td>${i<2?C.entropy(i?b:a).toFixed(4):'Not a language alphabet'}</td></tr>`).join('');
    const grouped=Array.from({length:16},(_,i)=>statistics[2].counts.slice(i*16,i*16+16).reduce((x,y)=>x+y,0)/encrypted.length);
    bars('byte-chart',grouped,Array.from({length:16},(_,i)=>i.toString(16).toUpperCase()+'x'),{max:Math.max(...grouped,1/16)*1.2,percent:true,expected:1/16,title:'Encrypted body byte frequencies grouped by high hexadecimal nibble'});
    $('byte-counts').innerHTML=Array.from({length:256},(_,i)=>`<tr><td>${i} / 0x${i.toString(16).padStart(2,'0')}</td>${statistics.map(s=>`<td>${s.counts[i]}</td>`).join('')}</tr>`).join('');
    $('export-distributions').disabled=false;
  }
  function rank(){
    try{const rows=C.rank($('attack-text').value,reference());$('best-guess').textContent=rows[0].text;
      $('rank-status').textContent=`Best candidate: shift ${rows[0].key}; score ${rows[0].score.toFixed(2)}. Next candidate: shift ${rows[1].key}, score ${rows[1].score.toFixed(2)}. A lower score is not proof of the true key.`;
      $('candidates').innerHTML=rows.map((r,i)=>`<tr${i===0?' class="active-row"':''}><td>${i+1}</td><td>${r.key}</td><td>${r.score.toFixed(2)}</td><td>${esc(r.text.slice(0,130))}</td></tr>`).join('');
    }catch(e){$('rank-status').textContent=e.message;$('best-guess').textContent='';$('candidates').innerHTML='';}
  }
  async function decrypt(){
    if(!current||busy||searching)return;lock(true);$('lab-error').textContent='';
    try{const shift=C.integer($('decrypt-shift').value,0,25,'Caesar shift');const text=C.caesar(current.caesar,-shift);$('caesar-plain').textContent=text;
      try{const d=C.integer($('decrypt-key').value,1,4096,'Private key'),out=await C.decrypt(current.packet,d);$('ecc-plain').textContent=out;$('decrypt-status').textContent=`Caesar ${text===current.message?'matches the stored original':'does not match the stored original'}. ECC tag verified; plaintext ${out===current.message?'matches':'does not match'} the stored original.`;}
      catch(e){$('ecc-plain').textContent='Decryption failed: the key is wrong or the authenticated packet was changed.';$('decrypt-status').textContent=`Caesar ${text===current.message?'matches':'does not match'} the original. ECC authentication failed (or the entered key is invalid).`;}
    }catch(e){error(e);}finally{lock(false);}
  }
  async function encrypt(){
    if(busy||searching)return;lock(true);$('lab-error').textContent='';$('input-status').textContent='Encrypting…';await pause();
    try{const message=$('message-input').value;if(!message.length||message.length>12000)throw Error('Enter a message of 1–12,000 characters.');
      const shift=C.integer($('shift').value,0,25,'Caesar shift'),d=C.integer($('private-key').value,1,4096,'Private key');
      const packet=await C.encrypt(message,d);current={message,caesar:C.caesar(message,shift),packet};
      $('caesar-output').textContent=current.caesar;$('ecc-output').textContent=packet.ciphertext;$('packet-output').textContent=JSON.stringify(packet,null,2);
      $('decrypt-shift').value=shift;$('decrypt-key').value=d;$('attack-text').value=current.caesar;
      $('caesar-plain').textContent='';$('ecc-plain').textContent='';$('decrypt-status').textContent='Use the decryption controls to verify both stored ciphertexts.';
      $('search-status').textContent='Ready. The search receives the public point and packet, not the private-key input.';$('recovered-message').textContent='';$('search-progress').value=0;
      renderStatistics();rank();$('download-packet').disabled=false;$('encryption-results').classList.remove('stale');
      $('input-status').textContent='Stored experiment updated. Encrypt again for a fresh ECC packet. Caesar remains deterministic.';
    }catch(e){error(e);$('input-status').textContent=current?'Encryption failed; previous stored experiment remains displayed.':'Encryption failed. Correct the inputs and retry.';}
    finally{lock(false);}
  }
  async function tamper(){
    if(!current||busy||searching)return;lock(true);
    try{const d=C.integer($('decrypt-key').value,1,4096,'Decryption private key');
      try{await C.decrypt(current.packet,d);}catch(e){$('decrypt-status').textContent='Enter the correct decryption key first so the unchanged packet can be verified before testing a modification.';return;}
      const packet={...current.packet},bytes=E.getBytes(packet.ciphertext);bytes[0]^=1;packet.ciphertext=E.hexlify(bytes);
      try{await C.decrypt(packet,d);$('decrypt-status').textContent='Unexpected: changed ciphertext accepted.';}
      catch(e){$('decrypt-status').textContent='Changed-packet test: authentication rejected the modified ciphertext. The stored original packet was preserved.';}
    }catch(e){$('decrypt-status').textContent=e.message;}finally{lock(false);}
  }
  async function search(){
    if(!current||busy||searching)return;
    try{const bound=C.integer($('bound').value,1,4096,'Search bound'),packet=structuredClone(current.packet);searching=true;cancel=false;lock(false);$('cancel-search').disabled=false;$('search-progress').max=bound;$('search-progress').value=0;$('recovered-message').textContent='';$('search-status').textContent='Searching public points…';
      const result=await C.search(packet.recipient,bound,{cancelled:()=>cancel,progress:done=>{$('search-progress').value=done;$('search-status').textContent=`${done} / ${bound} candidates checked…`;}});
      $('search-progress').value=result.attempts;
      const timing=`${result.attempts} candidates; ${result.ms.toFixed(1)} ms on this device.`;
      if(result.cancelled)$('search-status').textContent='Cancelled. '+timing;
      else if(result.key===null)$('search-status').textContent='No match in 1…'+bound+'. '+timing;
      else{const message=await C.decrypt(packet,result.key);$('search-status').textContent=`Recovered d = ${result.key}. Public point matched and GCM tag verified. ${timing}`;$('recovered-message').textContent=message;}
    }catch(e){$('search-status').textContent=e.shortMessage||e.message;}
    finally{searching=false;lock(false);$('cancel-search').disabled=true;}
  }
  async function runTrials(){
    $('run-trials').disabled=true;$('export-trials').disabled=true;experiment=null;$('trial-results').innerHTML='';$('trial-chart').innerHTML='';$('trial-status').textContent='Running held-out experiments…';await pause();
    try{const n=C.integer($('trial-count').value,1,40,'Trials'),seed=C.integer($('trial-seed').value,0,4294967295,'Seed');
      const ref=reference();experiment={...C.trials(ref,corpus.evaluation,n,seed),reference:ref.slice()};
      bars('trial-chart',experiment.summary.map(r=>r.rate),experiment.summary.map(r=>r.length),{max:1,percent:true,title:'Correct Caesar shift recovery rate by message length in letters'});
      $('trial-results').innerHTML=experiment.summary.map(r=>`<tr><td>${r.length}</td><td>${r.hits} / ${r.n}</td><td>${(r.rate*100).toFixed(1)}%</td></tr>`).join('');
      $('trial-status').textContent=`Completed ${n*7} disjoint samples, seed ${seed}. Reference: ${$('custom-corpus').value.trim()?'custom corpus':'Pride and Prejudice'}. Rates describe this experiment only.`;$('export-trials').disabled=false;
    }catch(e){$('trial-status').textContent=e.message;}finally{$('run-trials').disabled=false;}
  }
  for(const id of ['message-input','shift','private-key'])$(id).addEventListener('input',()=>{$('input-status').textContent='Inputs changed. Displayed outputs, decryption and attacks still refer to the stored experiment. Encrypt to update.';$('encryption-results').classList.add('stale');});
  $('custom-corpus').addEventListener('input',()=>{$('rank-status').textContent='Reference changed. Rank candidates again.';$('best-guess').textContent='';$('candidates').innerHTML='';$('trial-status').textContent='Reference changed. Run the length experiment again.';$('trial-results').innerHTML='';$('trial-chart').innerHTML='';experiment=null;$('export-trials').disabled=true;});
  $('attack-text').addEventListener('input',()=>{$('rank-status').textContent='Ciphertext changed. Rank candidates again.';$('best-guess').textContent='';$('candidates').innerHTML='';});
  for(const id of ['trial-count','trial-seed'])$(id).addEventListener('change',()=>{$('trial-status').textContent='Trial settings changed. Run again to update the results.';$('trial-results').innerHTML='';$('trial-chart').innerHTML='';experiment=null;$('export-trials').disabled=true;});
  $('corpus-description').textContent=`Built-in reference: ${corpus.trainingLetters.toLocaleString()} ASCII letters from Pride and Prejudice; evaluation extract: ${corpus.evaluation.length.toLocaleString()} letters from Alice. ${corpus.source}`;
  $('encrypt').addEventListener('click',encrypt);$('decrypt').addEventListener('click',decrypt);$('tamper').addEventListener('click',tamper);$('rank').addEventListener('click',rank);$('run-trials').addEventListener('click',runTrials);$('search').addEventListener('click',search);$('cancel-search').addEventListener('click',()=>{cancel=true;});
  $('download-packet').addEventListener('click',()=>{if(current)download('lesson2-ecc-packet.json',JSON.stringify(current.packet,null,2),'application/json');});
  $('export-distributions').addEventListener('click',()=>{if(statistics)download('lesson2-byte-counts.csv','byte,plaintext,caesar,ecc_body\n'+Array.from({length:256},(_,i)=>[i,...statistics.map(s=>s.counts[i])].join(',')).join('\n'));});
  $('export-trials').addEventListener('click',()=>{if(experiment)download('lesson2-caesar-trials.csv','seed,length,start_letter,true_shift,predicted_shift,success,reference_counts_A_to_Z\n'+experiment.rows.map(r=>[experiment.seed,r.length,r.start,r.key,r.predicted,Number(r.success),'"'+experiment.reference.join(';')+'"'].join(',')).join('\n'));});
  lock(false);encrypt();
})();
