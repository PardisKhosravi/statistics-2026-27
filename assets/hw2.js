(()=>{
  'use strict';
  const {$,esc,bars,download}=UI,W=WalletLab,E=ethers;
  let current=null,observations=null,bitCounts=null,busy=false;
  const next=()=>new Promise(resolve=>setTimeout(resolve,0));
  function clearStatistics(){
    observations=null;bitCounts=null;$('export-wallet').disabled=true;$('export-bits').disabled=true;
    $('wallet-observations').innerHTML='';
    $('wallet-metrics').querySelectorAll('strong').forEach(el=>el.textContent='—');
    for(const id of ['avalanche-chart','hex-chart','hash-balance-chart','letter-chart'])$(id).innerHTML='<p class="note">Run the experiments to populate this chart.</p>';
    $('stats-conclusion').textContent='Run the experiments to see the measured summary.';
  }
  function dirty(){
    if(busy)return;
    $('pipeline-output').classList.add('stale');$('wallet-status').textContent='Inputs changed. Run the pipeline to update the results.';$('run-stats').disabled=true;clearStatistics();
  }
  async function derive(){
    if(busy)return;busy=true;$('derive').disabled=true;$('run-stats').disabled=true;$('wallet-error').textContent='';$('wallet-status').textContent='Deriving…';
    await next();
    try{
      const phrase=$('mnemonic').value.trim().replace(/\s+/g,' '),account=Number($('account').value),index=Number($('address-index').value);
      if($('account').value===''||$('address-index').value==='')throw Error('Account and address index cannot be empty.');
      current=W.pipeline(phrase,$('passphrase').value,account,index);
      $('entropy-out').textContent=current.entropy;
      const ent=(current.entropy.length-2)*4,cs=ent/32;
      $('mnemonic-detail').textContent=`${current.phrase.split(' ').length} words · ${ent} entropy bits + ${cs} checksum bits · groups of 11 bits index a 2,048-word list.`;
      $('seed-out').textContent=current.seed;
      $('master-out').innerHTML=`<strong>Master private key</strong><br>${esc(current.masterKey)}<br><br><strong>Master chain code</strong><br>${esc(current.chainCode)}`;
      $('private-out').textContent=current.privateKey;$('public-out').textContent=current.publicKey;
      $('digest-out').textContent=current.digest;$('address-out').textContent=current.address;$('checksum-out').textContent=current.checksummed;
      $('path-preview').textContent=current.path;
      const siblings=[];
      for(let i=index;i<Math.min(index+3,2**31);i++){const node=current.parent.deriveChild(i);siblings.push(`<tr><td><code>${esc(W.pathFor(account,i))}</code></td><td><code>${esc(node.address)}</code></td></tr>`);}
      $('siblings').innerHTML=siblings.join('');$('pipeline-output').classList.remove('stale');clearStatistics();
      $('wallet-status').textContent='Pipeline computed. Identical inputs reproduce these exact values.';$('stats-status').textContent=`Ready to sample sibling addresses from ${current.path}.`;
      $('run-stats').disabled=false;
    }catch(e){
      current=null;$('pipeline-output').classList.add('stale');$('siblings').innerHTML='';clearStatistics();$('wallet-error').textContent=e.shortMessage||e.message;$('wallet-status').textContent='The displayed pipeline is not updated. Correct the inputs and try again.';
    }finally{busy=false;$('derive').disabled=false;}
  }
  function checkAddress(){
    try{
      const input=$('checksum-input').value.trim(),r=W.checksum(input);
      $('check-status').textContent=r.exact?'Exact EIP-55 checksum encoding.':r.unchecksummed?'Address syntax is valid, but this single-case input does not match the EIP-55 encoding.':'Checksum mismatch: the mixed letter case is incorrect.';
      $('check-expected').innerHTML='Expected: '+Array.from(r.expected).map(c=>/[A-F]/.test(c)?`<span class="upper">${c}</span>`:c).join('');
    }catch(e){$('check-status').textContent=e.message;$('check-expected').textContent='';}
  }
  function compareHashes(){
    const bytes=E.toUtf8Bytes($('hash-message').value),h=W.hashes(bytes);
    for(const key of ['keccak','sha3','sha256','sha512'])$('hash-'+key).textContent=h[key];
    const base=bytes.length?bytes:new Uint8Array([0]),flipped=new Uint8Array(base);flipped[0]^=1;
    const a=E.keccak256(base),b=E.keccak256(flipped),distance=W.distance(a,b),s=W.bitString(a),t=W.bitString(b);
    $('single-avalanche').textContent=`${distance} / 256 output bits changed`;
    $('hash-bits').innerHTML=Array.from(s,(c,i)=>`<span class="bit ${c!==t[i]?'changed':''}" title="Bit ${i}: ${c} → ${t[i]}"></span>`).join('');
    $('hash-change').textContent=`${(distance/256*100).toFixed(1)}% changed. Base input: ${base.length} byte${base.length===1?'':'s'}; byte 0 changes from ${base[0].toString(16).padStart(2,'0')} to ${flipped[0].toString(16).padStart(2,'0')} (hex).`;
  }
  function entropy(counts){const n=counts.reduce((a,b)=>a+b,0);return -counts.reduce((s,v)=>s+(v?v/n*Math.log2(v/n):0),0);}
  async function runStats(){
    if(busy||!current)return;
    const n=Number($('sample-size').value),start=Number($('address-index').value);
    if(start+n>2**31){$('stats-status').textContent='The requested sample exceeds the non-hardened address-index range. Choose a lower index.';return;}
    busy=true;
    const controls=['run-stats','derive','wallet-reset','preset','mnemonic','passphrase','account','address-index','sample-size'];controls.forEach(id=>$(id).disabled=true);
    const rows=[],fx=Array(16).fill(0),letters=Array(41).fill(0),ones=Array(256).fill(0),distances=[];
    clearStatistics();
    try{
      for(let i=0;i<n;i++){
        const msg=E.toUtf8Bytes('StatisticsLab|'+i),flipped=new Uint8Array(msg);flipped[0]^=1;
        const hash=E.keccak256(msg),dist=W.distance(hash,E.keccak256(flipped));distances.push(dist);
        Array.from(W.bitString(hash)).forEach((b,j)=>ones[j]+=Number(b));
        const index=start+i,node=current.parent.deriveChild(index),address=node.address,raw=address.slice(2).toLowerCase();
        for(const c of raw)fx[parseInt(c,16)]++;
        const l=(raw.match(/[a-f]/g)||[]).length;letters[l]++;
        rows.push({i,index,dist,address,letters:l,path:current.path.replace(/\d+$/,String(index))});
        if(i%8===0){$('stats-status').textContent=`Computing ${i+1} / ${n} hash trials and sibling addresses…`;await next();}
      }
      observations=rows;bitCounts=ones;
      const mean=distances.reduce((a,b)=>a+b,0)/n,balance=ones.reduce((a,b)=>a+b,0)/(n*256),hexEntropy=entropy(fx),meanLetters=rows.reduce((s,r)=>s+r.letters,0)/n;
      const metrics=[mean.toFixed(2),(balance*100).toFixed(2)+'%',hexEntropy.toFixed(3),meanLetters.toFixed(2)];
      $('wallet-metrics').querySelectorAll('strong').forEach((el,i)=>el.textContent=metrics[i]);
      const bins=Array(33).fill(0);distances.forEach(d=>bins[Math.floor(d/8)]++);
      const lo=Math.max(0,Math.floor(Math.min(...distances)/8)-1),hi=Math.min(32,Math.floor(Math.max(...distances)/8)+1);
      bars('avalanche-chart',bins.slice(lo,hi+1),Array.from({length:hi-lo+1},(_,i)=>(lo+i)*8),{title:'Hash Hamming distances, bins of width 8; labels show bin lower bounds'});
      bars('hex-chart',fx.map(v=>v/(40*n)),Array.from('0123456789abcdef'),{title:'Observed proportions of hexadecimal address digits',expected:1/16,percent:true,orange:true});
      const blocks=Array.from({length:16},(_,i)=>ones.slice(i*16,i*16+16).reduce((a,b)=>a+b,0)/(16*n));
      bars('hash-balance-chart',blocks,Array.from({length:16},(_,i)=>i+1),{title:'Hash bit balance, 16 consecutive blocks of 16 bits',expected:.5,max:1,percent:true});
      const llo=Math.max(0,Math.min(...rows.map(r=>r.letters))-1),lhi=Math.min(40,Math.max(...rows.map(r=>r.letters))+1);
      bars('letter-chart',letters.slice(llo,lhi+1),Array.from({length:lhi-llo+1},(_,i)=>llo+i),{title:'Number of addresses with each count of checksum-carrying letters',orange:true});
      $('wallet-observations').innerHTML=rows.map(r=>`<tr><td>${r.i} / ${r.index}</td><td>${r.dist}</td><td><code>${r.address}</code></td><td>${r.letters}</td></tr>`).join('');
      $('stats-conclusion').textContent=`For N = ${n}, mean hash Hamming distance = ${mean.toFixed(2)} (ideal-model mean 128); hash output ones = ${(balance*100).toFixed(2)}% (reference 50%); pooled address hex entropy = ${hexEntropy.toFixed(3)} / 4 bits; mean checksum-carrying letters = ${meanLetters.toFixed(2)} (reference 15). These observations describe this finite sample; they do not prove independence or cryptographic security.`;
      $('stats-status').textContent=`Complete: ${n} deterministic hash trials and ${n} actual sibling addresses. Starting path ${rows[0].path}.`;
      $('export-wallet').disabled=false;$('export-bits').disabled=false;
    }catch(e){$('stats-status').textContent='Experiment failed: '+(e.shortMessage||e.message);}
    finally{busy=false;controls.forEach(id=>$(id).disabled=false);}
  }
  $('derive').onclick=derive;
  $('preset').onchange=()=>{if($('preset').value==='bip39')$('mnemonic').value=W.DEMO;if($('preset').value==='dev')$('mnemonic').value='test test test test test test test test test test test junk';dirty();};
  ['mnemonic','passphrase','account','address-index'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='mnemonic')$('preset').value='custom';dirty();}));
  $('wallet-reset').onclick=()=>{$('preset').value='bip39';$('mnemonic').value=W.DEMO;$('passphrase').value='';$('account').value=0;$('address-index').value=0;derive();};
  $('check-address').onclick=checkAddress;
  $('mutate-address').onclick=()=>{const input=$('checksum-input').value;const i=Array.from(input).findIndex((c,j)=>j>1&&/[a-f]/i.test(c));if(i!==-1){const c=input[i];$('checksum-input').value=input.slice(0,i)+(c===c.toUpperCase()?c.toLowerCase():c.toUpperCase())+input.slice(i+1);}checkAddress();};
  $('compare-hashes').onclick=compareHashes;$('hash-message').addEventListener('keydown',e=>{if(e.key==='Enter')compareHashes();});
  $('run-stats').onclick=runStats;
  $('sample-size').onchange=()=>{clearStatistics();$('stats-status').textContent='Sample size changed. Run the experiments to update the measurements.';};
  $('export-wallet').onclick=()=>{if(!observations)return;download('hw2-observations.csv','trial,hash_input,changed_keccak_bits,address_index,path,checksummed_address,letter_count\n'+observations.map(r=>[r.i,'StatisticsLab|'+r.i,r.dist,r.index,r.path,r.address,r.letters].join(',')).join('\n'));};
  $('export-bits').onclick=()=>{if(!bitCounts)return;download('hw2-keccak-bit-counts.csv','bit_index_msb_first,ones,trials,proportion\n'+bitCounts.map((v,i)=>[i,v,observations.length,v/observations.length].join(',')).join('\n'));};
  const tests=W.selfTests();$('self-tests').innerHTML=tests.map(t=>`<tr><td>${esc(t.name)}</td><td class="${t.pass?'test-pass':'test-fail'}">${t.pass?'PASS':'FAIL'}</td></tr>`).join('');$('test-total').textContent=`${tests.filter(t=>t.pass).length} / ${tests.length} passed`;
  checkAddress();compareHashes();derive();
})();
