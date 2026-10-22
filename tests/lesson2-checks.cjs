const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),ethers=require('../assets/vendor/ethers.umd.min.js');
const sandbox={window:{},ethers,crypto:crypto.webcrypto,TextEncoder,TextDecoder,Uint8Array,setTimeout,performance,console};vm.createContext(sandbox);
for(const file of ['corpus-en.js','crypto-experiment.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
const C=sandbox.window.CryptoExperiment,corpus=sandbox.window.EnglishCorpus;
let checks=0;function ok(value,message){assert.ok(value,message);checks++;}
(async()=>{
  ok(C.caesar('Abc XYZ! café 🌷',3)==='Def ABC! fdié 🌷','ASCII rotation preserves nonletters');
  for(let s=0;s<26;s++){const text='AaZz, punctuation 123 – فارسی';ok(C.caesar(C.caesar(text,s),-s)===text,'Caesar round trip '+s);}
  ok(C.entropy([1,1,1,1])===2,'known entropy');ok(C.byteStats(new Uint8Array([0,255])).ones===.5,'known bit balance');
  ok(C.G==='0x0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798','standard secp256k1 generator');
  const d=173,msg='Same message: café, فارسی, 🌷\nUTF-8 survives.';
  const packet=await C.encrypt(msg,d),second=await C.encrypt(msg,d);
  ok(await C.decrypt(packet,d)===msg,'hybrid Unicode round trip');
  ok(packet.ciphertext!==second.ciphertext&&packet.ephemeral!==second.ephemeral&&packet.iv!==second.iv,'fresh encryption randomness');
  ok(Object.keys(packet).sort().join(',')==='ciphertext,ephemeral,iv,recipient,salt,version','public packet has no private scalar');
  // Independent node:crypto recipient ECDH, HKDF and AES-GCM interoperability.
  const ecdh=crypto.createECDH('secp256k1');ecdh.setPrivateKey(Buffer.from(ethers.toBeHex(d,32).slice(2),'hex'));
  const ikm=ecdh.computeSecret(Buffer.from(packet.ephemeral.slice(2),'hex'));
  const header=Buffer.from(JSON.stringify([packet.version,packet.recipient,packet.ephemeral,packet.salt,packet.iv]));
  const aes=crypto.hkdfSync('sha256',ikm,Buffer.from(packet.salt.slice(2),'hex'),header,32);
  const all=Buffer.from(packet.ciphertext.slice(2),'hex'),dec=crypto.createDecipheriv('aes-256-gcm',Buffer.from(aes),Buffer.from(packet.iv.slice(2),'hex'));
  dec.setAAD(header);dec.setAuthTag(all.subarray(-16));ok(Buffer.concat([dec.update(all.subarray(0,-16)),dec.final()]).toString()===msg,'independent Node ECDH/HKDF/GCM decrypt');
  await assert.rejects(C.decrypt(packet,d+1));checks++;
  for(const field of ['ciphertext','salt','iv','ephemeral','recipient']){
    const changed={...packet};if(field==='ephemeral'||field==='recipient')changed[field]=C.keyFor(99).compressedPublicKey;else changed[field]=changed[field].slice(0,-2)+(changed[field].endsWith('00')?'01':'00');
    await assert.rejects(C.decrypt(changed,d));checks++;
  }
  for(const bad of [0,-1,4097,1.5,NaN,'']){assert.throws(()=>C.integer(bad,1,4096));checks++;}
  for(const scalar of [1,32,173,4096]){const result=await C.search(C.keyFor(scalar).compressedPublicKey,scalar);ok(result.key===scalar&&result.attempts===scalar,'bounded search '+scalar);}
  const found=await C.search(packet.recipient,200);ok(await C.decrypt(packet,found.key)===msg,'attack decrypts with recovered key');
  ok((await C.search(packet.recipient,10)).key===null,'out-of-range key not found');
  ok((await C.search(packet.recipient,200,{cancelled:()=>true})).cancelled,'search cancels');
  const plain=corpus.evaluation.slice(0,2000);for(let s=0;s<26;s++)ok(C.rank(C.caesar(plain,s),corpus.counts)[0].key===s,'held-out Caesar recovery '+s);
  const result=C.trials(corpus.counts,corpus.evaluation,40,20261015),again=C.trials(corpus.counts,corpus.evaluation,40,20261015);
  ok(JSON.stringify(result)===JSON.stringify(again),'repeatable length trials');
  let end=0;for(const row of result.rows){ok(row.start>=end,'disjoint samples');end=row.start+row.length;}
  ok(end<=corpus.evaluation.length,'evaluation bounds');
  assert.throws(()=>C.rank('123',corpus.counts));checks++;
  console.log('PASS · '+checks+' Lesson 2 checks, including independent crypto interoperability, tampering, attacks and sampling.');
  console.log('Measured rates (40 trials per length): '+result.summary.map(r=>r.length+': '+r.hits+'/'+r.n).join('; '));
})().catch(e=>{console.error(e);process.exitCode=1;});
