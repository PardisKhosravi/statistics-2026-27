/* Educational hybrid encryption, Caesar analysis and reproducible experiments.
 * secp256k1 arithmetic: vendored ethers 6.15.0; HKDF/AES-GCM: Web Crypto.
 * No network requests. Not a production encryption protocol.
 */
window.CryptoExperiment = (() => {
  'use strict';
  const E=ethers, enc=new TextEncoder(), dec=new TextDecoder('utf-8',{fatal:true});
  const ORDER=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
  const VERSION='statistics-l2-ecdh-hkdf-aesgcm-v1';
  const G=new E.SigningKey(E.toBeHex(1,32)).compressedPublicKey;
  function integer(x,min,max,label='Value') {
    if(x===''||!Number.isSafeInteger(Number(x))||Number(x)<min||Number(x)>max) throw Error(`${label} must be an integer from ${min} to ${max}.`);
    return Number(x);
  }
  function caesar(text,key) {
    key=((key%26)+26)%26;
    return text.replace(/[A-Za-z]/g,c=>{const base=c<='Z'?65:97;return String.fromCharCode(base+(c.charCodeAt(0)-base+key)%26);});
  }
  // Analysis counts the same ASCII letters that Caesar actually rotates.
  const letters=text=>text.replace(/[^A-Za-z]/g,'').toUpperCase();
  function counts(text) {const c=Array(26).fill(0);for(const ch of letters(text))c[ch.charCodeAt(0)-65]++;return c;}
  function entropy(c) {const n=c.reduce((a,b)=>a+b,0);return n?-c.reduce((s,v)=>s+(v?v/n*Math.log2(v/n):0),0):0;}
  function frequencies(c) {const n=c.reduce((a,b)=>a+b,0);return c.map(x=>n?x/n:0);}
  function rank(ciphertext,reference) {
    const c=counts(ciphertext),n=c.reduce((a,b)=>a+b,0),total=reference.reduce((a,b)=>a+b,0);
    if(!n)throw Error('Enter at least one A–Z letter for Caesar analysis.');
    if(!total)throw Error('The reference corpus has no A–Z letters.');
    // Add-one smoothing avoids zero expected bins in a custom corpus.
    const p=reference.map(v=>(v+1)/(total+26));
    return Array.from({length:26},(_,key)=>({key,score:p.reduce((s,f,i)=>s+(c[(i+key)%26]-n*f)**2/(n*f),0),text:caesar(ciphertext,-key)})).sort((a,b)=>a.score-b.score||a.key-b.key);
  }
  function byteStats(bytes) {
    const c=Array(256).fill(0);let ones=0;
    for(const b of bytes){c[b]++;for(let i=0;i<8;i++)ones+=(b>>i)&1;}
    return {counts:c,entropy:entropy(c),ones:bytes.length?ones/(8*bytes.length):0,n:bytes.length};
  }
  const keyFor=d=>new E.SigningKey(E.toBeHex(d,32));
  function randomScalar() {let n;do{n=BigInt(E.hexlify(crypto.getRandomValues(new Uint8Array(32))));}while(n===0n||n>=ORDER);return n;}
  function header(packet) {return JSON.stringify([packet.version,packet.recipient,packet.ephemeral,packet.salt,packet.iv]);}
  async function aesKey(secret,packet) {
    const input=await crypto.subtle.importKey('raw',E.getBytes(secret).slice(1,33),'HKDF',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:E.getBytes(packet.salt),info:enc.encode(header(packet))},input,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function encrypt(message,d) {
    integer(d,1,4096,'Recipient private key');
    if(!crypto.subtle)throw Error('Web Crypto needs HTTPS or a trusted local preview.');
    const recipient=keyFor(d),ephemeral=keyFor(randomScalar());
    const packet={version:VERSION,recipient:recipient.compressedPublicKey,ephemeral:ephemeral.compressedPublicKey,salt:E.hexlify(crypto.getRandomValues(new Uint8Array(32))),iv:E.hexlify(crypto.getRandomValues(new Uint8Array(12)))};
    const secret=ephemeral.computeSharedSecret(packet.recipient),key=await aesKey(secret,packet);
    packet.ciphertext=E.hexlify(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:E.getBytes(packet.iv),additionalData:enc.encode(header(packet)),tagLength:128},key,enc.encode(message))));
    return packet;
  }
  async function decrypt(packet,d) {
    integer(d,1,4096,'Decryption private key');
    if(packet.version!==VERSION)throw Error('Unsupported packet version.');
    const secret=keyFor(d).computeSharedSecret(packet.ephemeral),key=await aesKey(secret,packet);
    return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:E.getBytes(packet.iv),additionalData:enc.encode(header(packet)),tagLength:128},key,E.getBytes(packet.ciphertext)));
  }
  async function search(publicKey,bound,{progress=()=>{},cancelled=()=>false}={}) {
    integer(bound,1,4096,'Search bound');
    const target=E.SigningKey.computePublicKey(publicKey,true);let point=G;
    const start=performance.now();
    for(let d=1;d<=bound;d++) {
      if(cancelled())return {key:null,attempts:d-1,cancelled:true,ms:performance.now()-start};
      if(point===target)return {key:d,attempts:d,cancelled:false,ms:performance.now()-start};
      if(d<bound)point=E.SigningKey.addPoints(point,G,true);
      if(d%32===0){progress(d);await new Promise(r=>setTimeout(r,0));}
    }
    return {key:null,attempts:bound,cancelled:false,ms:performance.now()-start};
  }
  function trials(reference,evaluation,n=20,seed=20261015) {
    integer(n,1,40,'Trials');
    let state=seed>>>0;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
    const lengths=[10,25,50,100,250,500,1000],schedule=lengths.flatMap(length=>Array.from({length:n},()=>length));
    for(let i=schedule.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[schedule[i],schedule[j]]=[schedule[j],schedule[i]];}
    let offset=0;const rows=[];
    if(schedule.reduce((a,b)=>a+b,0)>evaluation.length)throw Error('Not enough held-out letters for disjoint samples.');
    for(const length of schedule){const start=offset,plain=evaluation.slice(offset,offset+=length),key=Math.floor(random()*26),predicted=rank(caesar(plain,key),reference)[0].key;rows.push({length,start,key,predicted,success:key===predicted});}
    const summary=lengths.map(length=>{const samples=rows.filter(r=>r.length===length),hits=samples.filter(r=>r.success).length;return {length,n,hits,rate:hits/n};});
    return {seed,rows,summary};
  }
  return {integer,caesar,letters,counts,entropy,frequencies,rank,byteStats,keyFor,encrypt,decrypt,search,trials,G,ORDER};
})();
